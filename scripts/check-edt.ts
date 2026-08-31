import Database from "better-sqlite3";
const db = new Database("./dev.db");
const rows = db.prepare("SELECT id, classeId, position, jour FROM emploi_du_temps_eleves LIMIT 10").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
