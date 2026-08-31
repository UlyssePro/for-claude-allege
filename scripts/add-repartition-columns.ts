import Database from "better-sqlite3";
const db = new Database("./dev.db");
db.pragma("foreign_keys = OFF");

const columnsToAdd: Record<string, string> = {
  trimestreId: "TEXT",
  titreId: "TEXT",
  objectifId: "TEXT",
  notionId: "TEXT",
  exerciceId: "TEXT",
  pratiqueId: "TEXT",
};

for (const [column, type] of Object.entries(columnsToAdd)) {
  try {
    db.exec(`ALTER TABLE "repartitions" ADD COLUMN "${column}" ${type}`);
    console.log(`Added column ${column} ${type}`);
  } catch (e) {
    console.warn(`Column ${column} may already exist:`, (e as Error).message);
  }
}

db.pragma("foreign_keys = ON");
db.close();
console.log("Done");
