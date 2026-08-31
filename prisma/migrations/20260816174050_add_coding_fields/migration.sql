-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_codings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "languageId" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'code',
    "element" TEXT NOT NULL,
    "explication" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "codings_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_codings" ("createdAt", "element", "explication", "id", "languageId", "updatedAt") SELECT "createdAt", "element", "explication", "id", "languageId", "updatedAt" FROM "codings";
DROP TABLE "codings";
ALTER TABLE "new_codings" RENAME TO "codings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
