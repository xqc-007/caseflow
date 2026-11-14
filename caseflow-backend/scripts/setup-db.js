const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('../db');

async function setupDatabase(db = pool) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Serialize setup calls so simultaneous first runs cannot race.
    await client.query('SELECT pg_advisory_xact_lock(176311, 1)');
    await client.query(`CREATE TABLE IF NOT EXISTS caseflow_migrations (
      version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const applied = await client.query('SELECT version FROM caseflow_migrations WHERE version = $1', ['001_initial']);
    if (applied.rowCount === 0) {
      const sql = await fs.readFile(path.join(__dirname, '../db/migrations/001_initial.sql'), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO caseflow_migrations (version) VALUES ($1)', ['001_initial']);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  setupDatabase()
    .then(() => console.log('CaseFlow schema is ready.'))
    .catch(error => { console.error('Database setup failed:', error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
module.exports = { setupDatabase };
