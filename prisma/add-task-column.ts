import Database from "better-sqlite3";

const db = new Database("./dev.db");

const cols = db.prepare(`PRAGMA table_info("repartitions")`).all() as any[];
const hasTask = cols.some((c) => c.name === "task");

if (!hasTask) {
  db.exec(`ALTER TABLE "repartitions" ADD COLUMN "task" TEXT`);
  console.log("✅ Colonne task ajoutée à repartitions");
} else {
  console.log("ℹ️ Colonne task déjà présente");
}

db.close();
