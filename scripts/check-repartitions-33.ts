import Database from "better-sqlite3";
const db = new Database("./dev.db");
const rows = db.prepare("SELECT id, classeId, date, position, statut FROM repartitions WHERE classeId = '33' LIMIT 10").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
