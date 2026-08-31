import Database from "better-sqlite3";
const db = new Database("./dev.db");

const sessions = db.prepare("SELECT id, label FROM sessions").all();
console.log("Sessions:", JSON.stringify(sessions, null, 2));

const users = db.prepare(`
  SELECT u.id, u.username, u.sessionId, r.label as roleLabel
  FROM users u
  LEFT JOIN roles r ON u.roleId = r.id
  ORDER BY u.username
`).all();
console.log("Users:", JSON.stringify(users, null, 2));
