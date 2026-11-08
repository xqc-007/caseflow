require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.trim().length < 32 || jwtSecret === "caseflow_secret") {
  throw new Error("JWT_SECRET must be set to a random secret of at least 32 characters");
}

module.exports = { jwtSecret };
