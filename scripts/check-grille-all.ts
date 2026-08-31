import Database from "better-sqlite3";
const db = new Database("./dev.db");
const rows = db.prepare("SELECT id, position, date, classeId, horaireId, enseignantId FROM grilles_emploi_temps").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
