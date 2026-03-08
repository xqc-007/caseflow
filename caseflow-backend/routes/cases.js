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
    const result = await pool.query(
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

    res.status(201).json(result.rows[0]);
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

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating note:", error.message);
    res.status(500).json({ error: "Failed to create note" });
  }
});

module.exports = router;