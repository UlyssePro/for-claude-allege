import Database from "better-sqlite3";
const db = new Database("./dev.db");
const cols = db.prepare('PRAGMA table_info("grilles_emploi_temps")').all();
console.log("grilles_emploi_temps columns:", (cols as any[]).map((c: any) => c.name).join(", "));
const rows = db.prepare("SELECT * FROM grilles_emploi_temps LIMIT 3").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
