import Database from "better-sqlite3";
const db = new Database("./dev.db");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='codeFiles'").all();
console.log(JSON.stringify(tables));
db.close();
