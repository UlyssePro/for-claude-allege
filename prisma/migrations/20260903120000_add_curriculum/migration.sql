-- CreateTable
CREATE TABLE "school_years" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolYearId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    CONSTRAINT "periods_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years" ("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "class_levels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycle" TEXT
);

-- CreateTable
CREATE TABLE "curricula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "schoolYearId" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    CONSTRAINT "curricula_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years" ("id"),
    CONSTRAINT "curricula_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "class_levels" ("id"),
    CONSTRAINT "curricula_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods" ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "modules_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula" ("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "chapters_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules" ("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COURSE',
    CONSTRAINT "lessons_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "school_years_label_key" ON "school_years"("label");

-- CreateIndex
CREATE UNIQUE INDEX "periods_schoolYearId_code_key" ON "periods"("schoolYearId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "class_levels_code_key" ON "class_levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "curricula_schoolYearId_classLevelId_periodId_key" ON "curricula"("schoolYearId", "classLevelId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "modules_curriculumId_order_key" ON "modules"("curriculumId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_moduleId_order_key" ON "chapters"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_chapterId_order_key" ON "lessons"("chapterId", "order");
