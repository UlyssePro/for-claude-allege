-- AlterTable
ALTER TABLE "repartitions" ADD COLUMN "exerciceId" TEXT;
ALTER TABLE "repartitions" ADD COLUMN "notionId" TEXT;
ALTER TABLE "repartitions" ADD COLUMN "objectifId" TEXT;
ALTER TABLE "repartitions" ADD COLUMN "pratiqueId" TEXT;
ALTER TABLE "repartitions" ADD COLUMN "titreId" TEXT;
ALTER TABLE "repartitions" ADD COLUMN "trimestreId" TEXT;

-- CreateTable
CREATE TABLE "quizs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "difficulte" INTEGER,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "enseignantId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "usualClasseId" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "quizAttempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quizAttempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quizActivations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usualClasseId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "chatMessages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "medias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'video',
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "classeId" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "duration" INTEGER,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mediaViews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "codeFiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "ownerId" TEXT,
    "classeId" TEXT,
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "parentPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "codings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "languageId" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "explication" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "codings_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_trimestres" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matiereId" TEXT,
    "enseignantId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "lecon" TEXT NOT NULL,
    "examen1" TEXT,
    "examen2" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trimestres_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "trimestres_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "enseignants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_trimestres" ("classeId", "createdAt", "enseignantId", "examen1", "examen2", "id", "lecon", "matiereId", "numero", "updatedAt") SELECT "classeId", "createdAt", "enseignantId", "examen1", "examen2", "id", "lecon", "matiereId", "numero", "updatedAt" FROM "trimestres";
DROP TABLE "trimestres";
ALTER TABLE "new_trimestres" RENAME TO "trimestres";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "quizActivations_usualClasseId_key" ON "quizActivations"("usualClasseId");

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");
