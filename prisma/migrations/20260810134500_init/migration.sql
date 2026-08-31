-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "logged" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT,
    "resetToken" TEXT,
    "resetTokenExpires" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "matieres" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "abrev" TEXT,
    "coeff" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "classes_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "lieux_ecoles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "taux" INTEGER
);

-- CreateTable
CREATE TABLE "usualClasses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libelle" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "usualClasseId" TEXT,
    "categorieId" TEXT,
    "lieuId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "classes_usualClasseId_fkey" FOREIGN KEY ("usualClasseId") REFERENCES "usualClasses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "classes_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "classes_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "classes_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "lieux_ecoles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "genres_eleve" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "gen" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "enseignants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "contact" TEXT,
    "adresse" TEXT,
    "dpservice" TEXT,
    "profSess" TEXT,
    "photo" TEXT,
    "matiereId" TEXT,
    "categorieId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "handledById" TEXT,
    CONSTRAINT "enseignants_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "enseignants_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "classes_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "enseignants_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "eleves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "dob" TEXT,
    "sob" TEXT,
    "age" TEXT,
    "domic" TEXT,
    "contact" TEXT,
    "numero" TEXT,
    "obs" TEXT,
    "photo" TEXT,
    "anscol" TEXT,
    "classeId" TEXT,
    "genreId" TEXT,
    "handledById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "eleves_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "eleves_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres_eleve" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "eleves_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "note1" TEXT,
    "note2" TEXT,
    "note3" TEXT,
    "note4" TEXT,
    "note5" TEXT,
    CONSTRAINT "notes_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "eleves" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notes_profId_fkey" FOREIGN KEY ("profId") REFERENCES "enseignants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "notes_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "grilles_emploi_temps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position" INTEGER NOT NULL,
    "annee" TEXT,
    "task" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'NON_FAIT',
    "enseignantId" TEXT NOT NULL,
    "matiereId" TEXT,
    "classeId" TEXT,
    "lieuId" TEXT,
    "horaireId" TEXT,
    "date" DATETIME,
    CONSTRAINT "grilles_emploi_temps_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "enseignants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "grilles_emploi_temps_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "grilles_emploi_temps_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "grilles_emploi_temps_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "lieux_ecoles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "emploi_du_temps_eleves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eleveId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "date" DATETIME,
    "annee" TEXT,
    "jour" INTEGER NOT NULL,
    "matiereId" TEXT,
    "classeId" TEXT,
    "lieuId" TEXT,
    "horaireId" TEXT,
    "sourceGrilleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "emploi_du_temps_eleves_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "eleves" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "emploi_du_temps_eleves_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "emploi_du_temps_eleves_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "emploi_du_temps_eleves_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "lieux_ecoles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "emploi_du_temps_eleves_sourceGrilleId_fkey" FOREIGN KEY ("sourceGrilleId") REFERENCES "grilles_emploi_temps" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "repartitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numItem" TEXT,
    "annee" TEXT,
    "monthId" TEXT,
    "day" TEXT,
    "date" DATETIME,
    "position" INTEGER,
    "taux" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'NON_FAIT',
    "matiereId" TEXT,
    "enseignantId" TEXT,
    "classeId" TEXT,
    "semaineId" TEXT,
    "hourId" TEXT,
    "lieuId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "repartitions_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "repartitions_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "enseignants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "repartitions_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "repartitions_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "lieux_ecoles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trimestres" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matiereId" TEXT,
    "enseignantId" TEXT NOT NULL,
    "classeId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "lecon" TEXT NOT NULL,
    "examen1" TEXT,
    "examen2" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trimestres_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "trimestres_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "enseignants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cahiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trimestreId" TEXT NOT NULL,
    "titre" JSONB,
    "objectif" JSONB,
    "notion" JSONB,
    "exercice" JSONB,
    "pratique" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cahiers_trimestreId_fkey" FOREIGN KEY ("trimestreId") REFERENCES "trimestres" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");
