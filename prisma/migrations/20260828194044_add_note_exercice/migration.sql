-- CreateTable
CREATE TABLE "notesexercice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciceId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "note" TEXT,
    "fait" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
