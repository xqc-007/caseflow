const express = require('express');
const pool = require('../db');
const router = express.Router();
const statuses = new Set(['New', 'In Progress', 'Awaiting Response', 'Closed']);
const priorities = new Set(['Low', 'Medium', 'High', 'Urgent']);

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const badRequest = message => { throw new RequestError(400, message); };
function positiveId(value) {
  if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) || !Number.isInteger(Number(value)) || Number(value) > 2147483647) {
    badRequest('IDs must be positive integers');
  }
  return Number(value);
}
function assignedUser(value) {
  return value === null || value === '' ? null : positiveId(value);
}
function bodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) badRequest('A JSON object is required');
  return body;
}
function enumValue(value, allowed, label) {
  if (!allowed.has(value)) badRequest(`Invalid ${label}`);
  return value;
}
function dueDate(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value.startsWith('0000') || !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value) badRequest('Invalid due date');
  return value;
}
async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
async function findCase(db, id, lock = '') {
  const result = await db.query(`SELECT * FROM cases WHERE id = $1${lock}`, [id]);
  if (!result.rows[0]) throw new RequestError(404, 'Case not found');
  return result.rows[0];
}
function failure(res, error) {
  if (error instanceof RequestError) return res.status(error.status).json({ error: error.message });
  if (error.code === '23503') return res.status(400).json({ error: 'Referenced user or case does not exist' });
  console.error('Case operation failed:', error.message);
  return res.status(500).json({ error: 'Case operation failed' });
}
function route(handler) {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) { failure(res, error); }
  };
}
function activity(db, caseId, userId, type, text) {
  return db.query(`INSERT INTO case_activity (case_id, user_id, action_type, action_text)
    VALUES ($1, $2, $3, $4)`, [caseId, userId, type, text]);
}

router.use(require('../middleware/auth'));
router.param('id', (req, res, next, value) => {
  try { req.caseId = positiveId(value); next(); } catch (error) { failure(res, error); }
});

router.get('/', route(async (req, res) => {
  const result = await pool.query('SELECT * FROM cases ORDER BY id DESC');
  res.json(result.rows);
}));

router.post('/', route(async (req, res) => {
  const body = bodyObject(req.body);
  if (typeof body.title !== 'string' || !body.title.trim()) badRequest('A nonblank title is required');
  if (body.description !== undefined && typeof body.description !== 'string') badRequest('Description must be text');
  const status = enumValue(body.status === undefined ? 'New' : body.status, statuses, 'status');
  const priority = enumValue(body.priority === undefined ? 'Medium' : body.priority, priorities, 'priority');
  const due = body.due_date === undefined ? null : dueDate(body.due_date);
  const assigned = body.assigned_to === undefined ? null : assignedUser(body.assigned_to);
  const created = await transaction(async db => {
    const result = await db.query(`INSERT INTO cases
      (title, description, status, priority, due_date, assigned_to, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [body.title.trim(), body.description || '', status, priority, due, assigned, req.user.id]);
    const item = result.rows[0];
    await activity(db, item.id, req.user.id, 'case_created',
      `Case created with status "${item.status}" and priority "${item.priority}".`);
    return item;
  });
  res.status(201).json(created);
}));

router.get('/:id/notes', route(async (req, res) => {
  await findCase(pool, req.caseId);
  const result = await pool.query(`SELECT case_notes.id, case_notes.note_text,
    case_notes.created_at, users.full_name AS author_name FROM case_notes
    LEFT JOIN users ON case_notes.user_id = users.id
    WHERE case_notes.case_id = $1 ORDER BY case_notes.created_at DESC, case_notes.id DESC`, [req.caseId]);
  res.json(result.rows);
}));

router.post('/:id/notes', route(async (req, res) => {
  const body = bodyObject(req.body);
  if (typeof body.note_text !== 'string' || !body.note_text.trim()) badRequest('A nonblank note is required');
  const note = await transaction(async db => {
    await findCase(db, req.caseId, ' FOR KEY SHARE');
    const result = await db.query(`INSERT INTO case_notes (case_id, user_id, note_text)
      VALUES ($1, $2, $3) RETURNING *`, [req.caseId, req.user.id, body.note_text.trim()]);
    await activity(db, req.caseId, req.user.id, 'note_added', 'A new note was added to the case.');
    return result.rows[0];
  });
  res.status(201).json(note);
}));

router.put('/:id', route(async (req, res) => {
  const body = bodyObject(req.body);
  const patch = {};
  if (Object.hasOwn(body, 'status')) patch.status = enumValue(body.status, statuses, 'status');
  if (Object.hasOwn(body, 'priority')) patch.priority = enumValue(body.priority, priorities, 'priority');
  if (Object.hasOwn(body, 'assigned_to')) patch.assigned_to = assignedUser(body.assigned_to);
  if (!Object.keys(patch).length) badRequest('Provide status, priority or assigned_to');
  const updated = await transaction(async db => {
    // Serialize changes to this case so activity describes the actual previous values.
    const previous = await findCase(db, req.caseId, ' FOR UPDATE');
    const next = { ...previous, ...patch };
    const result = await db.query(`UPDATE cases SET status = $1, priority = $2,
      assigned_to = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
    [next.status, next.priority, next.assigned_to, req.caseId]);
    const item = result.rows[0];
    if (previous.status !== item.status) await activity(db, req.caseId, req.user.id,
      'status_changed', `Status changed from "${previous.status}" to "${item.status}".`);
    if (previous.priority !== item.priority) await activity(db, req.caseId, req.user.id,
      'priority_changed', `Priority changed from "${previous.priority}" to "${item.priority}".`);
    if (previous.assigned_to !== item.assigned_to) await activity(db, req.caseId, req.user.id,
      'assignment_changed', 'Assigned user changed.');
    return item;
  });
  res.json(updated);
}));

router.get('/:id/activity', route(async (req, res) => {
  await findCase(pool, req.caseId);
  const result = await pool.query(`SELECT case_activity.id, case_activity.action_type,
    case_activity.action_text, case_activity.created_at, users.full_name AS user_name
    FROM case_activity LEFT JOIN users ON case_activity.user_id = users.id
    WHERE case_activity.case_id = $1 ORDER BY case_activity.created_at DESC, case_activity.id DESC`, [req.caseId]);
  res.json(result.rows);
}));

module.exports = router;
