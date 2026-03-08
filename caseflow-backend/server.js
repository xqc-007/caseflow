const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");
const casesRoutes = require("./routes/cases");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});