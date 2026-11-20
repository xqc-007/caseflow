// Real Chromium + built React frontend + Express + disposable PostgreSQL schemas.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';

assert.equal(process.env.RUN_BROWSER_TESTS, '1', 'Opt in with RUN_BROWSER_TESTS=1');
assert.match(process.env.DB_NAME || '', /_test$/, 'Use a disposable DB_NAME ending in _test');
assert.ok(process.env.BROWSER_EXECUTABLE_PATH, 'Set BROWSER_EXECUTABLE_PATH to an installed Chromium executable');
const requireBackend = createRequire(new URL('../../caseflow-backend/package.json', import.meta.url));
const { Pool } = requireBackend('pg');
const admin = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, options: '',
});
const schema = `caseflow_browser_${process.pid}_${Date.now()}`;
const oldOptions = process.env.PGOPTIONS;
const oldApiUrl = process.env.VITE_API_URL;
const oldSecret = process.env.JWT_SECRET;
let pool, apiServer, site, browser, buildDir;
try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  process.env.PGOPTIONS = `-c search_path=${schema}`;
  process.env.JWT_SECRET = 'fictional-browser-test-secret-'.repeat(3);
  pool = requireBackend('./db');
  const { setupDatabase } = requireBackend('./scripts/setup-db');
  const { createDemoUser } = requireBackend('./scripts/create-demo-user');
  await setupDatabase();
  await setupDatabase();
  const password = 'Fictional-browser-password-123';
  await createDemoUser(pool, password);
  const app = requireBackend('./app');
  apiServer = app.listen(0, '127.0.0.1');
  await new Promise(resolve => apiServer.once('listening', resolve));
  const apiUrl = `http://127.0.0.1:${apiServer.address().port}`;
  process.env.VITE_API_URL = apiUrl;
  const root = fileURLToPath(new URL('../', import.meta.url));
  buildDir = await mkdtemp(join(tmpdir(), 'caseflow-browser-build-'));
  await build({ root, logLevel: 'error', build: { outDir: buildDir, emptyOutDir: true } });
  site = await preview({ root, logLevel: 'error', build: { outDir: buildDir }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  const url = `http://127.0.0.1:${site.httpServer.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE_PATH,
    args: JSON.parse(process.env.BROWSER_ARGS_JSON || '[]'), headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(10000);
  await page.goto(url);
  await page.getByRole('heading', { name: 'Sign in to CaseFlow' }).waitFor();
  await page.getByLabel('Email', { exact: true }).fill('demo@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('heading', { name: 'Create Case', exact: true }).waitFor();
  await page.getByPlaceholder('Case title', { exact: true }).fill('Fictional browser case');
  await page.locator('.form-card').getByRole('button', { name: 'Create Case', exact: true }).click();
  await page.getByText('Case created.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cases', exact: true }).click();
  await page.getByRole('button', { name: 'View Case', exact: true }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('Closed');
  await page.getByLabel('Priority', { exact: true }).selectOption('High');
  await page.getByRole('button', { name: 'Update Case', exact: true }).click();
  await page.getByText('Case updated.', { exact: true }).waitFor();
  await page.getByText('Status changed from "New" to "Closed".', { exact: true }).waitFor();
  await page.getByLabel('Case note').fill('Fictional browser note');
  await page.getByRole('button', { name: 'Add Note', exact: true }).click();
  await page.getByText('Fictional browser note', { exact: true }).waitFor();
  await page.getByText('A new note was added to the case.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Back to Cases' }).click();
  assert.equal(await page.locator('.badge-status-closed').textContent(), 'Closed');
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  assert.equal(await page.locator('.metric-card').filter({ hasText: 'Closed Cases' }).locator('h3').textContent(), '1');
  const token = await page.evaluate(() => localStorage.getItem('caseflow_token'));
  for (let i = 0; i < 6; i++) {
    const result = await fetch(`${apiUrl}/cases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: `Fictional seeded ${i}`, priority: i % 2 ? 'Low' : 'Urgent' }),
    });
    assert.equal(result.status, 201);
  }
  await page.reload();
  await page.getByRole('button', { name: 'Cases', exact: true }).click();
  await page.getByText('Page 1 of 2', { exact: true }).waitFor();
  assert.equal(await page.locator('.list-card').count(), 5);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('Page 2 of 2', { exact: true }).waitFor();
  assert.equal(await page.locator('.list-card').count(), 2);
  await page.getByPlaceholder('Search cases...').fill('BROWSER CASE');
  await page.getByText('Page 1 of 1', { exact: true }).waitFor();
  assert.equal(await page.locator('.list-card').count(), 1);
  await page.getByPlaceholder('Search cases...').fill('');
  const filters = page.locator('.toolbar-grid select');
  await filters.nth(0).selectOption('New');
  await filters.nth(1).selectOption('Urgent');
  await filters.nth(2).selectOption('priority');
  await page.getByText('Page 1 of 1', { exact: true }).waitFor();
  assert.equal(await page.locator('.list-card').count(), 3);
  // Restore a page and prove expired sessions are rejected by the real API.
  await page.evaluate(() => localStorage.setItem('caseflow_token', 'invalid-browser-test-token'));
  await page.reload();
  await page.getByRole('heading', { name: 'Sign in to CaseFlow' }).waitFor();
  await page.getByText('Your session has expired. Please sign in again.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('caseflow_token')), null);
  assert.deepEqual(errors, []);
  assert.equal((await pool.query('SELECT count(*) FROM cases')).rows[0].count, '7');
  assert.equal((await pool.query('SELECT note_text FROM case_notes')).rows[0].note_text, 'Fictional browser note');
  console.log('PASS: clean schema, login, creation, status/priority, notes/activity, dashboard, persisted reload, search/filter/sort/pagination and session expiry in real Chromium.');
} finally {
  if (browser) await browser.close();
  if (site) await new Promise(resolve => site.httpServer.close(resolve));
  if (apiServer) await new Promise(resolve => apiServer.close(resolve));
  if (pool) await pool.end();
  if (buildDir) await rm(buildDir, { recursive: true, force: true });
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
  for (const [key, value] of [['PGOPTIONS', oldOptions], ['VITE_API_URL', oldApiUrl], ['JWT_SECRET', oldSecret]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}
