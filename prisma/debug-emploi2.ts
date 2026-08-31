import { prisma } from "../src/lib/prisma";

async function main() {
  const grilles = await prisma.grilleEmploiTemps.findMany({
    select: {
      id: true,
      enseignantId: true,
      position: true,
      jour: true,
      date: true,
      classeId: true,
      annee: true,
    },
    take: 20,
  });
  console.log("GRILLES WITH JOUR/DATE:", JSON.stringify(grilles, null, 2));
}

main().catch(console.error);
