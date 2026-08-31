import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const sqlite = new Database("./dev.db");

const targetSessionId = "s1";

const enseignant = sqlite
  .prepare('SELECT id, prenom, nom FROM enseignants WHERE "sessionId" = ?')
  .get(targetSessionId) as any;

if (!enseignant) {
  console.error(`❌ Aucun enseignant trouvé avec sessionId = "${targetSessionId}"`);
  process.exit(1);
}

console.log(`✅ Enseignant trouvé : ${enseignant.prenom} ${enseignant.nom} (${enseignant.id})`);

const result = sqlite
  .prepare('UPDATE trimestres SET "enseignantId" = ?')
  .run(enseignant.id);

console.log(`✅ ${result.changes} trimestre(s) mis à jour avec enseignantId = ${enseignant.id}`);

sqlite.close();
