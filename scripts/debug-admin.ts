import Database from "better-sqlite3";
const db = new Database("./dev.db");

const rows = db.prepare(`
  SELECT u.id, u.username, u.sessionId, r.label as roleLabel
  FROM users u
  LEFT JOIN roles r ON u.roleId = r.id
  WHERE r.label = 'admin' OR u.username = 'admin'
`).all();

console.log(JSON.stringify(rows, null, 2));
