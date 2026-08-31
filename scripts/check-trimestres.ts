import Database from "better-sqlite3";
const db = new Database("./dev.db");
const rows = db.prepare("SELECT id, numero, lecon FROM trimestres LIMIT 5").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
