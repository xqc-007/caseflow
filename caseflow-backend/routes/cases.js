const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cases ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching cases:", error.message);
    res.status(500).json({ error: "Failed to fetch cases" });
  }
});

router.post("/", async (req, res) => {
  const {
    title,
    description,
    status,
    priority,
    due_date,
    assigned_to,
    created_by,
  } = req.body;

  try {
    const caseResult = await pool.query(
      `INSERT INTO cases (
        title,
        description,
        status,
        priority,
        due_date,
        assigned_to,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        title,
        description,
        status || "New",
        priority || "Medium",
        due_date || null,
        assigned_to || null,
        created_by || null,
      ]
    );

    const newCase = caseResult.rows[0];

    await pool.query(
      `INSERT INTO case_activity (
        case_id,
        user_id,
        action_type,
        action_text
      )
      VALUES ($1, $2, $3, $4)`,
      [
        newCase.id,
        created_by || null,
        "case_created",
        `Case created with status "${newCase.status}" and priority "${newCase.priority}".`,
      ]
    );

    res.status(201).json(newCase);
  } catch (error) {
    console.error("Error creating case:", error.message);
    res.status(500).json({ error: "Failed to create case" });
  }
});

router.get("/:id/notes", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         case_notes.id,
         case_notes.note_text,
         case_notes.created_at,
         users.full_name AS author_name
       FROM case_notes
       LEFT JOIN users
         ON case_notes.user_id = users.id
       WHERE case_notes.case_id = $1
       ORDER BY case_notes.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notes:", error.message);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.post("/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { user_id, note_text } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO case_notes (case_id, user_id, note_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, user_id, note_text]
    );

    await pool.query(
      `INSERT INTO case_activity (
        case_id,
        user_id,
        action_type,
        action_text
      )
      VALUES ($1, $2, $3, $4)`,
      [id, user_id, "note_added", "A new note was added to the case."]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating note:", error.message);
    res.status(500).json({ error: "Failed to create note" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status, priority, assigned_to } = req.body;

  try {
    const oldCaseResult = await pool.query(
      "SELECT * FROM cases WHERE id = $1",
      [id]
    );

    const oldCase = oldCaseResult.rows[0];

    const result = await pool.query(
      `UPDATE cases
       SET status = $1,
           priority = $2,
           assigned_to = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, priority, assigned_to, id]
    );

    const updatedCase = result.rows[0];

    if (oldCase.status !== updatedCase.status) {
      await pool.query(
        `INSERT INTO case_activity (case_id, user_id, action_type, action_text)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          updatedCase.created_by || null,
          "status_changed",
          `Status changed from "${oldCase.status}" to "${updatedCase.status}".`,
        ]
      );
    }

    if (oldCase.priority !== updatedCase.priority) {
      await pool.query(
        `INSERT INTO case_activity (case_id, user_id, action_type, action_text)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          updatedCase.created_by || null,
          "priority_changed",
          `Priority changed from "${oldCase.priority}" to "${updatedCase.priority}".`,
        ]
      );
    }

    if (oldCase.assigned_to !== updatedCase.assigned_to) {
      await pool.query(
        `INSERT INTO case_activity (case_id, user_id, action_type, action_text)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          updatedCase.created_by || null,
          "assignment_changed",
          `Assigned user changed.`,
        ]
      );
    }

    res.json(updatedCase);
  } catch (error) {
    console.error("Error updating case:", error.message);
    res.status(500).json({ error: "Failed to update case" });
  }
});

router.get("/:id/activity", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         case_activity.id,
         case_activity.action_type,
         case_activity.action_text,
         case_activity.created_at,
         users.full_name AS user_name
       FROM case_activity
       LEFT JOIN users
         ON case_activity.user_id = users.id
       WHERE case_activity.case_id = $1
       ORDER BY case_activity.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching activity:", error.message);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

module.exports = router;