import Database from "better-sqlite3";
const db = new Database("./dev.db");

const rows = db
  .prepare(`
    SELECT id, username, sessionId, roleId
    FROM users
    WHERE roleId = (SELECT id FROM roles WHERE label = 'Enseignant')
    ORDER BY username, createdAt
  `)
  .all();

const seen = new Map<string, string>();
const toDelete: string[] = [];

for (const row of rows as any[]) {
  const key = `${row.username.trim().toLowerCase()}|${row.sessionId}`;
  if (seen.has(key)) {
    toDelete.push(row.id);
  } else {
    seen.set(key, row.id);
  }
}

console.log("Duplicate users to delete:", toDelete);

for (const id of toDelete) {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  console.log("Deleted:", id);
}

console.log("Done");
