const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");

module.exports = function requireAuth(req, res, next) {
  const match = /^Bearer (\S+)$/i.exec(req.get("Authorization") || "");
  if (!match) return res.status(401).json({ error: "Authentication required" });

  try {
    const claims = jwt.verify(match[1], jwtSecret, { algorithms: ["HS256"] });
    if (!Number.isInteger(claims.id) || claims.id <= 0) throw new Error("Invalid user");
    req.user = { id: claims.id, role: claims.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
