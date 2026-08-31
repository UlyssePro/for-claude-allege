import Database from "better-sqlite3";
const db = new Database("./dev.db");
const cols = db.prepare('PRAGMA table_info("repartitions")').all();
console.log("repartitions columns:", (cols as any[]).map((c: any) => c.name).join(", "));
db.close();
