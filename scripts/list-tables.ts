import Database from "better-sqlite3";
const db = new Database("./dev.db");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((r: any) => r.name);
console.log("Tables:", tables.join(", "));
db.close();
