import Database from "better-sqlite3";
const db = new Database("./dev.db");
const cols = db.prepare('PRAGMA table_info("enseignants")').all();
console.log("enseignants columns:", (cols as any[]).map((c: any) => c.name).join(", "));
const rows = db.prepare("SELECT id, handledById FROM enseignants LIMIT 3").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
