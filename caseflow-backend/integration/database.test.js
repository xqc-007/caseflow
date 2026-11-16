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
    await t.test('malformed case, note and update inputs return 400 without writing', async () => {
      const before = await pool.query('SELECT (SELECT count(*) FROM cases) AS cases, (SELECT count(*) FROM case_notes) AS notes, (SELECT count(*) FROM case_activity) AS activity');
      for (const body of [[], { title: ' ' }, { title: 1 }, { title: 'x', description: {} },
        { title: 'x', status: 'invalid' }, { title: 'x', priority: null },
        { title: 'x', assigned_to: -1 }, { title: 'x', assigned_to: [1] },
        { title: 'x', due_date: '2026-02-30' }, { title: 'x', due_date: '0000-01-01' }]) {
        assert.equal((await request('/cases', 'POST', body)).status, 400);
      }
      // An omitted description is optional, and a real leap day is accepted.
      const minimal = await request('/cases', 'POST', { title: '  Minimal case  ', due_date: '2028-02-29' });
      assert.equal(minimal.status, 201);
      assert.equal(minimal.data.description, '');
      assert.equal(minimal.data.title, 'Minimal case');
      await pool.query('DELETE FROM cases WHERE id = $1', [minimal.data.id]);
      for (const body of [{}, { status: null }, { priority: 'unknown' }, { assigned_to: true }, { assigned_to: '2147483648' }]) {
        assert.equal((await request(`/cases/${caseId}`, 'PUT', body)).status, 400);
      }
      for (const body of [{}, { note_text: ' ' }, { note_text: 1 }]) {
        assert.equal((await request(`/cases/${caseId}/notes`, 'POST', body)).status, 400);
      }
      const after = await pool.query('SELECT (SELECT count(*) FROM cases) AS cases, (SELECT count(*) FROM case_notes) AS notes, (SELECT count(*) FROM case_activity) AS activity');
      assert.deepEqual(after.rows, before.rows);
    });
    await t.test('invalid IDs return 400 and missing cases return 404 consistently', async () => {
      for (const id of ['0', '-1', 'abc', '1.2', '2147483648']) {
        assert.equal((await request(`/cases/${id}/notes`)).status, 400);
      }
      for (const [route, method, body] of [
        ['/cases/999999', 'PUT', { status: 'Closed' }],
        ['/cases/999999/notes', 'GET'], ['/cases/999999/activity', 'GET'],
        ['/cases/999999/notes', 'POST', { note_text: 'missing case' }]
      ]) assert.equal((await request(route, method, body)).status, 404);
      const empty = await request('/cases', 'POST', { title: 'Empty history case' });
      assert.deepEqual((await request(`/cases/${empty.data.id}/notes`)).data, []);
      await pool.query('DELETE FROM cases WHERE id = $1', [empty.data.id]);
    });
    await t.test('partial updates preserve omitted fields and reject unknown assignees without writes', async () => {
      const updated = await request(`/cases/${caseId}`, 'PUT', { status: 'In Progress' });
      assert.equal(updated.status, 200);
      assert.equal(updated.data.priority, 'High');
      assert.equal(updated.data.assigned_to, 1);
      assert.equal((await request(`/cases/${caseId}`, 'PUT', { assigned_to: 999999 })).status, 400);
      assert.equal((await pool.query('SELECT assigned_to FROM cases WHERE id = $1', [caseId])).rows[0].assigned_to, 1);
      const cleared = await request(`/cases/${caseId}`, 'PUT', { assigned_to: '' });
      assert.equal(cleared.status, 200);
      assert.equal(cleared.data.assigned_to, null);
    });
    await t.test('activity failures roll back case creation, note insertion and all case changes', async () => {
      const beforeCase = (await pool.query('SELECT * FROM cases WHERE id = $1', [caseId])).rows;
      const counts = () => pool.query('SELECT (SELECT count(*) FROM cases) AS cases, (SELECT count(*) FROM case_notes) AS notes, (SELECT count(*) FROM case_activity) AS activity');
      const beforeCounts = await counts();
      await pool.query(`CREATE FUNCTION reject_test_activity() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.action_type IN ('case_created', 'note_added', 'priority_changed') THEN
            RAISE EXCEPTION 'Synthetic activity failure';
          END IF;
          RETURN NEW;
        END; $$`);
      await pool.query('CREATE TRIGGER reject_test_activity BEFORE INSERT ON case_activity FOR EACH ROW EXECUTE FUNCTION reject_test_activity()');
      try {
        assert.equal((await request('/cases', 'POST', { title: 'Must roll back' })).status, 500);
        assert.equal((await request(`/cases/${caseId}/notes`, 'POST', { note_text: 'Must roll back' })).status, 500);
        assert.equal((await request(`/cases/${caseId}`, 'PUT', { status: 'Closed', priority: 'Low', assigned_to: 1 })).status, 500);
        assert.deepEqual((await counts()).rows, beforeCounts.rows);
        assert.deepEqual((await pool.query('SELECT * FROM cases WHERE id = $1', [caseId])).rows, beforeCase);
      } finally { await pool.query('DROP TRIGGER reject_test_activity ON case_activity; DROP FUNCTION reject_test_activity()'); }
    });
    await t.test('concurrent changes record a continuous previous-status history', async () => {
      const current = (await pool.query('SELECT status FROM cases WHERE id = $1', [caseId])).rows[0].status;
      const start = (await pool.query('SELECT COALESCE(MAX(id), 0) AS id FROM case_activity')).rows[0].id;
      const results = await Promise.all([
        request(`/cases/${caseId}`, 'PUT', { status: 'Awaiting Response' }),
        request(`/cases/${caseId}`, 'PUT', { status: 'Closed' })
      ]);
      assert.ok(results.every(result => result.status === 200));
      const logs = (await pool.query("SELECT action_text FROM case_activity WHERE case_id = $1 AND id > $2 AND action_type = 'status_changed' ORDER BY id", [caseId, start])).rows;
      assert.equal(logs.length, 2);
      const first = /Status changed from "(.+)" to "(.+)"/.exec(logs[0].action_text);
      const second = /Status changed from "(.+)" to "(.+)"/.exec(logs[1].action_text);
      assert.equal(first[1], current);
      assert.equal(first[2], second[1]);
      assert.equal(second[2], (await pool.query('SELECT status FROM cases WHERE id = $1', [caseId])).rows[0].status);
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
