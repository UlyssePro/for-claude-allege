import Database from "better-sqlite3";
const db = new Database("./dev.db");

const fk = db
  .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`)
  .get() as { sql?: string } | undefined;

const match = fk?.sql?.match(/CONSTRAINT\s+(\S+)\s+FOREIGN KEY\s*\(\s*sessionId\s*\)/i);
if (match?.[1]) {
  try {
    db.exec(`ALTER TABLE users DROP CONSTRAINT ${match[1]}`);
    console.log("Dropped FK", match[1]);
  } catch (e: any) {
    console.log("skip FK:", e.message);
  }
}

try {
  db.exec('ALTER TABLE users DROP COLUMN "sessionId"');
  console.log("Dropped users.sessionId");
} catch (e: any) {
  console.log("skip column:", e.message);
}

console.log("done");
