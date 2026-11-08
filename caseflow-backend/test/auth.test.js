const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

process.env.JWT_SECRET = 'test-only-secret-'.repeat(4);
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');
const app = require('../app');
let server, base, calls, query;
const originalQuery = pool.query;
const user = { id: 7, role: 'admin', full_name: 'Test User' };
const token = () => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
const request = (route, options = {}) => fetch(base + route, options);
const post = (body, auth) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) });

before(async () => {
  user.password_hash = await bcrypt.hash('correct-password', 4);
  pool.query = async (...args) => { calls.push(args); return query(...args); };
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => { calls = []; query = async () => ({ rows: [] }); });
after(async () => {
  await new Promise(resolve => server.close(resolve));
  pool.query = originalQuery;
  await pool.end();
});

test('startup refuses missing and short JWT secrets', () => {
  for (const secret of ['', 'short', 'caseflow_secret']) {
    const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.resolve(__dirname, '../config'))})`], {
      cwd: __dirname, env: { ...process.env, JWT_SECRET: secret }, encoding: 'utf8'
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JWT_SECRET must be set/);
  }
});

test('login rejects malformed credentials before querying the database', async () => {
  for (const body of [{}, { email: 1, password: 'x' }, { email: 'a@b.com', password: [] }, { email: ' ', password: 'x' }]) {
    const res = await request('/auth/login', post(body));
    assert.equal(res.status, 400);
  }
  assert.equal(calls.length, 0);
});

test('unknown account and wrong password return the same response', async () => {
  const missing = await request('/auth/login', post({ email: 'missing@example.com', password: 'wrong' }));
  query = async () => ({ rows: [user] });
  const wrong = await request('/auth/login', post({ email: 'test@example.com', password: 'wrong' }));
  assert.equal(missing.status, 401);
  assert.equal(wrong.status, 401);
  assert.deepEqual(await missing.json(), await wrong.json());
});

test('successful login returns an eight-hour token and safe user fields', async () => {
  query = async () => ({ rows: [user] });
  const res = await request('/auth/login', post({ email: 'test@example.com', password: 'correct-password' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data.user, { id: 7, name: 'Test User', role: 'admin' });
  const claims = jwt.verify(data.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  assert.equal(claims.id, 7);
  assert.equal(claims.exp - claims.iat, 8 * 60 * 60);
  assert.equal(JSON.stringify(data).includes('password_hash'), false);
});

test('all case routes reject unauthenticated requests without querying the database', async () => {
  for (const [method, route] of [['GET','/cases'], ['POST','/cases'], ['PUT','/cases/1'], ['GET','/cases/1/notes'], ['POST','/cases/1/notes'], ['GET','/cases/1/activity']]) {
    assert.equal((await request(route, { method })).status, 401);
  }
  assert.equal(calls.length, 0);
});

test('invalid, expired, wrong-secret and unsupported-algorithm tokens are rejected', async () => {
  const invalid = ['garbage', jwt.sign({ id: 7 }, process.env.JWT_SECRET, { expiresIn: -1 }), jwt.sign({ id: 7 }, 'wrong-secret'), jwt.sign({ id: 7 }, process.env.JWT_SECRET, { algorithm: 'HS384' }), jwt.sign({ id: '7' }, process.env.JWT_SECRET)];
  for (const value of invalid) {
    assert.equal((await request('/cases', { headers: { Authorization: `Bearer ${value}` } })).status, 401);
  }
  assert.equal(calls.length, 0);
});

test('a valid token permits case reads', async () => {
  query = async () => ({ rows: [{ id: 1, title: 'Fictional case' }] });
  const res = await request('/cases', { headers: { Authorization: `Bearer ${token()}` } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), [{ id: 1, title: 'Fictional case' }]);
});

test('case creation ignores spoofed creator and records the signed-in actor', async () => {
  query = async sql => ({ rows: sql.includes('INSERT INTO cases') ? [{ id: 2, status: 'New', priority: 'Medium' }] : [] });
  const res = await request('/cases', post({ title: 'Fictional case', created_by: 999 }, token()));
  assert.equal(res.status, 201);
  assert.equal(calls[0][1][6], 7);
  assert.equal(calls[1][1][1], 7);
});

test('note creation ignores spoofed author and records the signed-in actor', async () => {
  query = async () => ({ rows: [{ id: 1 }] });
  const res = await request('/cases/2/notes', post({ user_id: 999, note_text: 'Fictional note' }, token()));
  assert.equal(res.status, 201);
  assert.equal(calls[0][1][1], 7);
  assert.equal(calls[1][1][1], 7);
});

test('case changes attribute activity to the signed-in actor rather than the creator', async () => {
  query = async sql => {
    if (sql.startsWith('SELECT')) return { rows: [{ id: 2, status: 'New', priority: 'Low', assigned_to: null, created_by: 999 }] };
    if (sql.includes('UPDATE cases')) return { rows: [{ id: 2, status: 'Closed', priority: 'High', assigned_to: 3, created_by: 999 }] };
    return { rows: [] };
  };
  const options = post({ status: 'Closed', priority: 'High', assigned_to: 3 }, token());
  options.method = 'PUT';
  const res = await request('/cases/2', options);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 5);
  for (const call of calls.slice(2)) assert.equal(call[1][1], 7);
});
