import Database from "better-sqlite3";
import fs from "fs";

const db = new Database("./dev.db");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((r: any) => r.name);
const backup: any = {};
for (const table of tables) {
  try {
    const rows = db.prepare("SELECT * FROM " + table).all();
    backup[table] = rows;
  } catch (e) {
    backup[table] = { error: (e as Error).message };
  }
}
fs.writeFileSync("./db-backup-before-schema-change.json", JSON.stringify(backup, null, 2));
console.log("Backup written to db-backup-before-schema-change.json");
db.close();
