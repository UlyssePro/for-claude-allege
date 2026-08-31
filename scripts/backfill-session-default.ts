import Database from "better-sqlite3";
const db = new Database("./dev.db");

const session = db.prepare('SELECT id FROM sessions WHERE label = ?').get("2025-2026") as { id: string } | undefined;
if (!session) {
  console.log("Session 2025-2026 not found");
  process.exit(1);
}

const defaultSessionId = session.id;

db.exec(`UPDATE users SET sessionId = '${defaultSessionId}' WHERE sessionId IS NULL`);
db.exec(`UPDATE enseignants SET sessionId = '${defaultSessionId}' WHERE sessionId IS NULL`);
db.exec(`UPDATE eleves SET sessionId = '${defaultSessionId}' WHERE sessionId IS NULL`);

console.log("Backfilled sessionId to", defaultSessionId);
