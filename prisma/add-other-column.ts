import Database from "better-sqlite3";

const db = new Database("./dev.db");

const cols = db.prepare(`PRAGMA table_info("repartitions")`).all() as any[];
const hasOther = cols.some((c) => c.name === "other");

if (!hasOther) {
  db.exec(`ALTER TABLE "repartitions" ADD COLUMN "other" TEXT`);
  console.log("✅ Colonne other ajoutée à repartitions");
} else {
  console.log("ℹ️ Colonne other déjà présente");
}

db.close();
