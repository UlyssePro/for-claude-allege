import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

/**
 * Ce script sera remplacé par le script de migration dédié qui relira
 * database/db.json de l'ancien projet et remplira ces tables (élèves,
 * enseignants, classes, matières...) — voir la prochaine étape.
 *
 * En attendant, il pose juste les données de référence "fixes" qui ne
 * dépendent d'aucune donnée existante.
 */
async function main() {
  await prisma.role.createMany({
    data: [
      { label: "SuperAdmin" },
      { label: "Admin" },
      { label: "Enseignant" },
      { label: "Visiteur" },
    ],
  });

  await prisma.genreEleve.createMany({
    data: [
      { label: "Fille", gen: "Féminin" },
      { label: "Garçon", gen: "Masculin" },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
