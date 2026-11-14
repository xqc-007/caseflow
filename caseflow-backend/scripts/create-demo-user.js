const bcrypt = require('bcrypt');
const pool = require('../db');

async function createDemoUser(db = pool, password = process.env.DEMO_PASSWORD) {
  if (typeof password !== 'string' || password.trim().length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Set DEMO_PASSWORD to a unique password of at least 12 characters and at most 72 UTF-8 bytes');
  }
  const hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id`,
    ['Fictional Demo Admin', 'demo@example.test', hash, 'admin']
  );
  return result.rowCount > 0;
}

if (require.main === module) {
  createDemoUser()
    .then(created => console.log(created
      ? 'Created fictional demo account: demo@example.test (use the password you supplied).'
      : 'demo@example.test already exists; its password and data were left unchanged.'))
    .catch(error => { console.error('Demo account setup failed:', error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
module.exports = { createDemoUser };
