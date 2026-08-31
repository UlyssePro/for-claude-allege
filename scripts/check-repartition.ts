import Database from "better-sqlite3";
const db = new Database("./dev.db");
const rows = db.prepare("SELECT id, classeId, trimestreId, titreId, objectifId, notionId, exerciceId, pratiqueId FROM repartitions WHERE id = ?").all("cmsovm3rz000108dxq9a5fjcm");
console.log(JSON.stringify(rows, null, 2));
db.close();
