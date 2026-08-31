import Database from "better-sqlite3";
const db = new Database("./dev.db");
const rows = db.prepare("SELECT id, enseignantId, classeId, date, position, horaireId FROM grilles_emploi_temps LIMIT 5").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
