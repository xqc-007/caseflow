export const SESSION_EXPIRED = 'caseflow:session-expired';
const API_URL = (import.meta.env?.VITE_API_URL ?? 'http://localhost:5001').replace(/\/$/, '');

export function clearSession() {
  localStorage.removeItem('caseflow_token');
  localStorage.removeItem('caseflow_user');
}

export function readSession() {
  try {
    const token = localStorage.getItem('caseflow_token');
    const user = JSON.parse(localStorage.getItem('caseflow_user'));
    if (token && Number.isInteger(user?.id) && user.id > 0 && typeof user.name === 'string') return user;
  } catch { /* Incomplete or corrupt sessions must return to sign-in. */ }
  clearSession();
  return null;
}

export async function apiRequest(path, { auth = true, body, ...options } = {}) {
  const token = localStorage.getItem('caseflow_token');
  const headers = { ...options.headers };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Could not reach CaseFlow. Check your connection and try again.');
  }
  if (auth && response.status === 401) {
    // A delayed rejection from an old session must not sign out a newer login.
    if (localStorage.getItem('caseflow_token') === token) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED));
    }
    throw new Error('Your session has expired. Please sign in again.');
  }
  let data;
  try { data = await response.json(); } catch {
    throw new Error('CaseFlow returned an unreadable response. Please try again.');
  }
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}). Please try again.`);
  return data;
}

export async function apiList(path, options) {
  const data = await apiRequest(path, options);
  if (!Array.isArray(data)) throw new Error('CaseFlow returned an unexpected response. Please try again.');
  return data;
}
