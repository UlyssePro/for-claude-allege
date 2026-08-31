import Database from "better-sqlite3";
const db = new Database("./dev.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    label TEXT UNIQUE NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const insert = db.prepare(
  "INSERT OR IGNORE INTO sessions (id, label) VALUES (?, ?)",
);
const sessions = [
  ["s1", "2025-2026"],
  ["s2", "2026-2027"],
  ["s3", "2027-2028"],
  ["s4", "2028-2029"],
  ["s5", "2029-2030"],
];
sessions.forEach(([id, label]) => insert.run(id, label));

function addColumn(table: string, column: string) {
  try {
    db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" TEXT`);
  } catch (e: any) {
    if (!e.message.includes("duplicate column")) throw e;
  }
}

addColumn("users", "sessionId");
addColumn("enseignants", "sessionId");
addColumn("eleves", "sessionId");

console.log("DB migration done");
