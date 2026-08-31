import Database from "better-sqlite3";
import db from "../db.json" assert { type: "json" };

const sqlite = new Database("./dev.db");

try {
  const rows = sqlite.prepare("SELECT id, matiereId FROM enseignants WHERE matiereId IS NOT NULL").all() as { id: string; matiereId: string }[];
  
  let totalUpdated = 0;
  for (const enseignant of rows) {
    const result = sqlite.prepare(
      "UPDATE repartitions SET matiereId = ? WHERE enseignantId = ? AND deleted = 0 AND matiereId IS NULL"
    ).run(enseignant.matiereId, enseignant.id);
    totalUpdated += result.changes;
  }

  console.log(`Mettre à jour terminé: ${totalUpdated} repartitions modifiées`);
} finally {
  sqlite.close();
}
