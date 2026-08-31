import Database from "better-sqlite3";
const db = new Database("./dev.db");

db.exec("PRAGMA foreign_keys = OFF");

db.exec(`
  CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    image TEXT,
    logged INTEGER NOT NULL DEFAULT 0,
    roleId TEXT,
    resetToken TEXT UNIQUE,
    resetTokenExpires TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  INSERT INTO users_new (id, username, email, password, image, logged, roleId, resetToken, resetTokenExpires, createdAt, updatedAt)
  SELECT id, username, email, password, image, logged, roleId, resetToken, resetTokenExpires, createdAt, updatedAt FROM users
`);

db.exec("DROP TABLE users");
db.exec("ALTER TABLE users_new RENAME TO users");

db.exec("PRAGMA foreign_keys = ON");

console.log("Migrated users without sessionId");
