import Database from "better-sqlite3";

const db = new Database("./dev.db");

try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS "suivis_repartition_repartitionId_eleveId_key"
    ON "suivis_repartition" ("repartitionId", "eleveId")
  `);
  console.log("✅ Index unique sur suivis_repartition créé");
} catch (error) {
  console.error("Erreur lors de la création de l'index:", error);
}

db.close();
