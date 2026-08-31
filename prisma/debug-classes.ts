import { prisma } from "../src/lib/prisma";

async function main() {
  const classes = await prisma.classe.findMany({
    select: { id: true, label: true },
    orderBy: { label: "asc" },
  });
  console.log("CLASSES:", classes);

  const grilles = await prisma.grilleEmploiTemps.findMany({
    select: { id: true, classeId: true, enseignantId: true },
    take: 20,
  });
  console.log("GRILLES WITH CLASSEID:", grilles);

  const classeIds = new Set(grilles.map((g) => g.classeId));
  const missingClasses = grilles.filter((g) => !classes.some((c) => c.id === g.classeId));
  console.log("MISSING CLASSES FOR GRILLES:", missingClasses);
}

main().catch(console.error);
