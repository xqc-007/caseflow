import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { apiRequest } from '../src/api';

const user = { id: 1, name: 'Fictional Admin', role: 'admin' };
const initial = { id: 1, title: 'Fictional case', description: 'Synthetic data', status: 'New', priority: 'Medium', assigned_to: null, created_at: '2026-01-01' };
function setup({ corrupt = false, stored = true } = {}) {
  localStorage.clear();
  if (stored) {
    localStorage.setItem('caseflow_token', 'test-token');
    localStorage.setItem('caseflow_user', corrupt ? '{broken' : JSON.stringify(user));
  }
  const state = { cases: [{ ...initial }], notes: [], activity: [], failCases: false, failNotes: false, failUpdate: false, expire: false };
  const json = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
  const fetchMock = vi.fn(async (url, options = {}) => {
    const parsed = new URL(url);
    expect(parsed.origin).toBe('http://127.0.0.1:5101');
    const path = parsed.pathname;
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    if (path === '/auth/login') return json({ token: 'new-token', user });
    if (state.expire) return json({ error: 'Invalid or expired token' }, 401);
    expect(options.headers.Authorization).toMatch(/^Bearer (test-token|new-token)$/);
    if (path === '/cases' && method === 'GET') return state.failCases ? json({ error: 'Cases temporarily unavailable' }, 503) : json([...state.cases]);
    if (path === '/cases' && method === 'POST') {
      const created = { ...initial, ...body, id: state.cases.length + 1 };
      state.cases.push(created); return json(created, 201);
    }
    if (path === '/cases/1' && method === 'PUT') {
      if (state.failUpdate) return json({ error: 'Referenced user or case does not exist' }, 400);
      state.cases[0] = { ...state.cases[0], ...body };
      state.activity.push({ id: 1, action_text: 'Status changed to Closed', created_at: '2026-01-01' });
      return json(state.cases[0]);
    }
    if (path.endsWith('/notes')) {
      if (state.failNotes) return json({ error: 'Notes temporarily unavailable' }, 503);
      if (method === 'POST') {
        const note = { id: 1, note_text: body.note_text, author_name: user.name, created_at: '2026-01-01' };
        state.notes.push(note);
        state.activity.push({ id: 2, action_text: 'A new note was added to the case.', created_at: '2026-01-01' });
        return json(note, 201);
      }
      return json([...state.notes]);
    }
    if (path.endsWith('/activity')) return json([...state.activity]);
    throw new Error(`Unexpected test request: ${path}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { state, fetchMock, ui: userEvent.setup() };
}
async function details(ui) {
  await ui.click(screen.getByRole('button', { name: 'Cases', exact: true }));
  await ui.click(await screen.findByRole('button', { name: 'View Case' }));
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('existing CaseFlow interactions with mocked API responses', () => {
  test('corrupt storage returns to login and configured API sign-in succeeds', async () => {
    const { ui, fetchMock } = setup({ corrupt: true });
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sign in to CaseFlow' })).toBeTruthy();
    expect(screen.getByLabelText('Password').value).toBe('');
    await ui.type(screen.getByLabelText('Email'), 'demo@example.test');
    await ui.type(screen.getByLabelText('Password'), 'fictional-password');
    await ui.click(screen.getByRole('button', { name: 'Login', exact: true }));
    await screen.findByRole('heading', { name: 'Create Case' });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/cases'))).toBe(true));
  });

  test('dashboard read errors have a working retry', async () => {
    const { state, ui } = setup(); state.failCases = true;
    render(<App />);
    expect((await screen.findByRole('alert')).textContent).toContain('Cases temporarily unavailable');
    state.failCases = false;
    await ui.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    await details(ui);
    expect(screen.getByRole('heading', { name: 'Fictional case', exact: true })).toBeTruthy();
  });

  test('case changes refresh activity, the list and dashboard totals; notes refresh history', async () => {
    const { ui } = setup(); render(<App />); await details(ui);
    await ui.selectOptions(screen.getByLabelText('Status', { exact: true }), 'Closed');
    await ui.click(screen.getByRole('button', { name: 'Update Case', exact: true }));
    expect((await screen.findByRole('status')).textContent).toContain('Case updated.');
    await screen.findByText('Status changed to Closed', { exact: true });
    await ui.type(screen.getByLabelText('Case note'), 'Fictional saved note');
    await ui.click(screen.getByRole('button', { name: 'Add Note', exact: true }));
    await screen.findByText('Fictional saved note', { exact: true });
    await screen.findByText('A new note was added to the case.', { exact: true });
    await ui.click(screen.getByRole('button', { name: 'Back to Cases' }));
    expect(document.querySelector('.badge-status-closed').textContent).toBe('Closed');
    await ui.click(screen.getByRole('button', { name: 'Dashboard', exact: true }));
    const card = screen.getByText('Closed Cases').closest('.metric-card');
    expect(within(card).getByRole('heading').textContent).toBe('1');
  });

  test('history errors can be retried and save failures preserve unsaved input', async () => {
    const { state, ui } = setup(); state.failNotes = true; state.failUpdate = true;
    render(<App />); await details(ui);
    expect((await screen.findByRole('alert')).textContent).toContain('Notes temporarily unavailable');
    state.failNotes = false;
    await ui.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No notes yet.');
    await ui.type(screen.getByLabelText('Assigned User ID'), '999');
    await ui.click(screen.getByRole('button', { name: 'Update Case', exact: true }));
    expect((await screen.findByRole('alert')).textContent).toContain('Referenced user or case does not exist');
    expect(screen.getByLabelText('Assigned User ID').value).toBe('999');
    expect(screen.getByRole('button', { name: 'Update Case', exact: true }).disabled).toBe(false);
  });

  test('401 clears the session and explains why sign-in is needed', async () => {
    const { state, ui } = setup(); render(<App />); await details(ui); state.expire = true;
    await ui.click(screen.getByRole('button', { name: 'Update Case', exact: true }));
    await screen.findByRole('heading', { name: 'Sign in to CaseFlow' });
    expect(screen.getByRole('status').textContent).toContain('session has expired');
    expect(localStorage.getItem('caseflow_token')).toBeNull();
    expect(localStorage.getItem('caseflow_user')).toBeNull();
  });

  test('creating a case refreshes the list and shows success', async () => {
    const { ui } = setup(); render(<App />);
    await ui.type(screen.getByPlaceholderText('Case title'), 'New fictional case');
    const form = screen.getByRole('heading', { name: 'Create Case' }).closest('.form-card');
    await ui.click(within(form).getByRole('button', { name: 'Create Case', exact: true }));
    expect((await screen.findByRole('status')).textContent).toContain('Case created.');
    await ui.click(screen.getByRole('button', { name: 'Cases', exact: true }));
    await screen.findByRole('heading', { name: 'New fictional case' });
  });

  test('an error object cannot be rendered as a history list', async () => {
    const { fetchMock, ui } = setup(); render(<App />);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    fetchMock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ unexpected: true }) }));
    await details(ui);
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    expect(screen.getAllByRole('alert')[0].textContent).toContain('unexpected response');
  });
});

test('a delayed 401 from an old token cannot clear a newer session', async () => {
  setup();
  let resolve;
  vi.stubGlobal('fetch', () => new Promise(done => { resolve = done; }));
  const request = apiRequest('/cases');
  localStorage.setItem('caseflow_token', 'new-token');
  resolve({ status: 401 });
  await expect(request).rejects.toThrow('session has expired');
  expect(localStorage.getItem('caseflow_token')).toBe('new-token');
});
