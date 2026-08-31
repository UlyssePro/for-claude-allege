import Database from "better-sqlite3";

const db = new Database("./dev.db");

const cols = db.prepare(`PRAGMA table_info("exercices")`).all() as any[];
const hasPratiqueId = cols.some((c) => c.name === "pratiqueId");

if (!hasPratiqueId) {
  db.exec(`ALTER TABLE "exercices" ADD COLUMN "pratiqueId" TEXT`);
  console.log("✅ Colonne pratiqueId ajoutée à exercices");
} else {
  console.log("ℹ️ Colonne pratiqueId déjà présente");
}

db.close();
