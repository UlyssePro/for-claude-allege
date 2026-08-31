import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const sqlite = new Database("./dev.db");

const users = sqlite.prepare("SELECT id, username, password FROM users").all() as any[];

let updated = 0;
for (const u of users) {
  // Check if password is already hashed (bcrypt starts with $2)
  if (u.password && !u.password.startsWith("$2")) {
    const hashed = bcrypt.hashSync(u.password, 10);
    sqlite.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, u.id);
    updated++;
  }
}
console.log(`Updated ${updated} passwords to bcrypt`);

// Create a default admin if not exists
const admin = sqlite.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!admin) {
  sqlite.prepare(
    `INSERT OR IGNORE INTO users (id, username, email, password, "roleId", logged, createdAt, updatedAt)
     VALUES ('admin', 'admin', 'admin@hmsgs.local', ?, '0', false, '2025-01-01 00:00:00', '2025-01-01 00:00:00')`,
  ).run(bcrypt.hashSync("admin123", 10));
  console.log("Created default admin user (admin/admin123)");
}

sqlite.close();
