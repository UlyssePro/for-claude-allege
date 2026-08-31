import Database from "better-sqlite3";
const db = new Database("./dev.db");
const rows = db.prepare("SELECT id, userId, token, expires FROM auth_sessions LIMIT 5").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
