const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");
const casesRoutes = require("./routes/cases");

const app = express();
const authRoutes = require("./routes/auth");

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

app.use("/cases", casesRoutes);

app.get("/", (req, res) => {
  res.send("root route works");
});

app.get("/hello", (req, res) => {
  res.send("hello route works");
});


app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully",
      time: result.rows[0],
    });
  } catch (error) {
    console.error("Database error:", error.message);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
  console.error('Request failed:', error.message);
  res.status(500).json({ error: 'Request failed' });
});

module.exports = app;
