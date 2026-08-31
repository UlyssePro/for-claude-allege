-- CreateTable
CREATE TABLE "exercices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "consigne" TEXT NOT NULL,
    "difficulte" INTEGER NOT NULL DEFAULT 1,
    "classe" TEXT,
    "enseignantId" TEXT NOT NULL,
    "matiereId" TEXT,
    "usualClasseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
