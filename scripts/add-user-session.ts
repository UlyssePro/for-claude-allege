import Database from "better-sqlite3";
const db = new Database("./dev.db");

try {
  db.exec('ALTER TABLE users ADD COLUMN "sessionId" TEXT');
  console.log("Added users.sessionId");
} catch (e: any) {
  if (!e.message.includes("duplicate column")) throw e;
  console.log("skip users.sessionId");
}

console.log("done");
