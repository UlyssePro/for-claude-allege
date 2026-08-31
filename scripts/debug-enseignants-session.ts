import Database from "better-sqlite3";
const db = new Database("./dev.db");

const enseignants = db.prepare(`
  SELECT id, nom, prenom, sessionId, handledById
  FROM enseignants
`).all();
console.log("Enseignants:", JSON.stringify(enseignants, null, 2));
