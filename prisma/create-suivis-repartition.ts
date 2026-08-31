import Database from "better-sqlite3";

const db = new Database("./dev.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS "suivis_repartition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repartitionId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "note" TEXT,
    "fait" INTEGER NOT NULL DEFAULT 0,
    "reponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS "suivis_repartition_repartitionId_eleveId_key"
  ON "suivis_repartition" ("repartitionId", "eleveId")
`);

const cols = db.prepare(`PRAGMA table_info("suivis_repartition")`).all() as any[];
const hasRepartitionId = cols.some((c) => c.name === "repartitionId");
if (!hasRepartitionId) {
  db.exec(`ALTER TABLE "suivis_repartition" ADD COLUMN "repartitionId" TEXT`);
}

console.log("✅ Table suivis_repartition prête");

db.close();
