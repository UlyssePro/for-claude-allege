import fs from "fs";

const currentPath = "./db.json";
const backupPath = "./db.json.bak";

const current = JSON.parse(fs.readFileSync(currentPath, "utf-8"));
const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

if (!Array.isArray(current.matieres)) current.matieres = [];
if (!Array.isArray(current.classes)) current.classes = [];

const backupMatieres = Array.isArray(backup.matieres) ? backup.matieres : [];
const backupClasses = Array.isArray(backup.classes) ? backup.classes : [];

const existingMatiereIds = new Set(current.matieres.map((m: any) => m.id));
const existingClasseIds = new Set(current.classes.map((c: any) => c.id));

for (const m of backupMatieres) {
  if (!existingMatiereIds.has(m.id)) {
    current.matieres.push({
      id: m.id,
      label: m.label,
      abrev: m.abrev || null,
      coeff: m.coeff || null,
      deleted: m.deleted || false,
      handledById: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      restoredAt: null,
    });
  }
}

for (const c of backupClasses) {
  if (!existingClasseIds.has(c.id)) {
    current.classes.push({
      id: c.id,
      label: c.label,
      classeTypeId: c.cltypeId || null,
      categorieId: c.cat || null,
      lieuId: c.lieu || null,
      deleted: c.deleted || false,
      handledById: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      restoredAt: null,
    });
  }
}

fs.writeFileSync(currentPath, JSON.stringify(current, null, 2));
console.log("Import terminé:");
console.log("- matières ajoutées:", backupMatieres.length - existingMatiereIds.size);
console.log("- classes ajoutées:", backupClasses.length - existingClasseIds.size);
