import Database from "better-sqlite3";
import fs from "fs";

const sqlite = new Database("./dev.db");
const tables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all() as { name: string }[];

const db: any = {};

for (const { name } of tables) {
  const rows = sqlite.prepare(`SELECT * FROM "${name}"`).all();
  db[name] = rows;
}

fs.writeFileSync("./db.json", JSON.stringify(db, null, 2));
console.log("Export terminé:", Object.keys(db).length, "tables");
sqlite.close();
