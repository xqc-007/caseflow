const { test } = require('node:test');
const assert = require('node:assert/strict');

// Opt in explicitly. Each run creates/removes isolated schemas in a disposable DB.
test('PostgreSQL clean setup and existing HTTP workflows', { skip: process.env.RUN_DB_TESTS !== '1' }, async t => {
  assert.match(process.env.DB_NAME || '', /_test$/, 'Use a disposable DB_NAME ending in _test');
  const { Pool } = require('pg');
  const admin = new Pool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, options: ''
  });
  const schema = `caseflow_test_${process.pid}_${Date.now()}`;
  const legacySchema = `${schema}_legacy`;
  let pool, server;
  const previousOptions = process.env.PGOPTIONS;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    process.env.PGOPTIONS = `-c search_path=${schema}`;
    process.env.JWT_SECRET = 'integration-only-secret-'.repeat(3);
    pool = require('../db');
    const { setupDatabase } = require('../scripts/setup-db');
    const { createDemoUser } = require('../scripts/create-demo-user');
    await t.test('schema setup can run twice without resetting records', async () => {
      await setupDatabase();
      await setupDatabase();
      const versions = await pool.query('SELECT version FROM caseflow_migrations');
      assert.deepEqual(versions.rows, [{ version: '001_initial' }]);
    });
    await t.test('demo provisioning requires an explicit password and never resets an existing account', async () => {
      await assert.rejects(createDemoUser(pool, ''), /DEMO_PASSWORD/);
      assert.equal(await createDemoUser(pool, 'Fictional-test-password-123'), true);
      assert.equal(await createDemoUser(pool, 'different-test-password-123'), false);
      const users = await pool.query('SELECT * FROM users');
      assert.equal(users.rowCount, 1);
      assert.equal(users.rows[0].email, 'demo@example.test');
      assert.notEqual(users.rows[0].password_hash, 'Fictional-test-password-123');
    });
    await t.test('documented setup commands finish successfully and do not print the supplied password', () => {
      const { spawnSync } = require('node:child_process');
      const path = require('node:path');
      for (const script of ['setup-db.js', 'create-demo-user.js']) {
        const result = spawnSync(process.execPath, [path.join(__dirname, '../scripts', script)], {
          env: { ...process.env, DEMO_PASSWORD: 'Fictional-test-password-123' }, encoding: 'utf8'
        });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.includes('Fictional-test-password-123'), false);
      }
    });
    const app = require('../app');
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let token, caseId;
    const request = async (route, method = 'GET', body) => {
      const response = await fetch(base + route, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      return { status: response.status, data: await response.json() };
    };
    await t.test('provisioned credentials log in and existing password survives reruns', async () => {
      const result = await request('/auth/login', 'POST', { email: 'demo@example.test', password: 'Fictional-test-password-123' });
      assert.equal(result.status, 200);
      token = result.data.token;
      assert.equal(result.data.user.name, 'Fictional Demo Admin');
    });
    await t.test('create, list, update, notes and activity persist through the real API', async () => {
      const created = await request('/cases', 'POST', {
        title: 'Fictional integration case', description: 'Synthetic data only',
        due_date: '2030-01-15', created_by: 999
      });
      assert.equal(created.status, 201);
      caseId = created.data.id;
      assert.equal(created.data.created_by, 1);
      assert.equal(created.data.status, 'New');
      assert.equal(created.data.priority, 'Medium');
      const note = await request(`/cases/${caseId}/notes`, 'POST', { note_text: 'Fictional note', user_id: 999 });
      assert.equal(note.status, 201);
      const updated = await request(`/cases/${caseId}`, 'PUT', { status: 'Closed', priority: 'High', assigned_to: 1 });
      assert.equal(updated.status, 200);
      assert.equal(updated.data.assigned_to, 1);
      const list = await request('/cases');
      assert.equal(list.data.length, 1);
      assert.equal(list.data[0].status, 'Closed');
      const notes = await request(`/cases/${caseId}/notes`);
      assert.equal(notes.data[0].note_text, 'Fictional note');
      assert.equal(notes.data[0].author_name, 'Fictional Demo Admin');
      const activity = await request(`/cases/${caseId}/activity`);
      assert.deepEqual(activity.data.map(row => row.action_type).sort(),
        ['assignment_changed', 'case_created', 'note_added', 'priority_changed', 'status_changed']);
      assert.ok(activity.data.every(row => row.user_name === 'Fictional Demo Admin'));
      await setupDatabase();
      assert.equal((await request('/cases')).data.length, 1);
    });
    await t.test('schema enforces case values, nonblank notes and user references', async () => {
      await assert.rejects(pool.query("UPDATE cases SET status = 'invalid' WHERE id = $1", [caseId]), { code: '23514' });
      await assert.rejects(pool.query("INSERT INTO case_notes (case_id,note_text) VALUES ($1,'   ')", [caseId]), { code: '23514' });
      await assert.rejects(pool.query('UPDATE cases SET assigned_to = 999 WHERE id = $1', [caseId]), { code: '23503' });
    });
    await t.test('conflicting legacy tables fail atomically without replacing existing data', async () => {
      await admin.query(`CREATE SCHEMA ${legacySchema}`);
      const legacy = new Pool({
        host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
        options: `-c search_path=${legacySchema}`
      });
      try {
        await legacy.query('CREATE TABLE users (legacy_value TEXT)');
        await legacy.query("INSERT INTO users VALUES ('preserve me')");
        await assert.rejects(setupDatabase(legacy), { code: '42P07' });
        assert.equal((await legacy.query('SELECT * FROM users')).rows[0].legacy_value, 'preserve me');
        assert.equal((await legacy.query("SELECT to_regclass('cases') AS cases, to_regclass('caseflow_migrations') AS migrations")).rows[0].cases, null);
        assert.equal((await legacy.query("SELECT to_regclass('caseflow_migrations') AS migrations")).rows[0].migrations, null);
      } finally { await legacy.end(); }
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.query(`DROP SCHEMA IF EXISTS ${legacySchema} CASCADE`);
    await admin.end();
    if (previousOptions === undefined) delete process.env.PGOPTIONS;
    else process.env.PGOPTIONS = previousOptions;
  }
});
