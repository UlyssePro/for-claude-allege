import { prisma } from "../src/lib/prisma";

async function main() {
  const enseignants = await prisma.enseignant.findMany({
    select: { id: true, prenom: true, nom: true, sessionId: true },
  });
  console.log("ENSEIGNANTS:", enseignants);

  const grilles = await prisma.grilleEmploiTemps.findMany({
    select: { id: true, enseignantId: true, annee: true, classeId: true },
    take: 20,
  });
  console.log("GRILLES:", grilles);

  const sessions = await prisma.session.findMany({
    select: { id: true, label: true },
  });
  console.log("SESSIONS:", sessions);
}

main().catch(console.error);
