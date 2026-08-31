-- CreateTable
CREATE TABLE "suivis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "enseignantId" TEXT,
    "type" TEXT NOT NULL,
    "resume" TEXT,
    "detail" JSONB,
    "noteId" TEXT,
    "quizAttemptId" TEXT,
    "exerciceId" TEXT,
    "cahierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
