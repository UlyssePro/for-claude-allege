import { prisma } from "@/lib/prisma";

async function main() {
  const defaultSession = await prisma.session.findFirst({
    where: { label: "2025-2026" },
  });

  if (!defaultSession) {
    console.log("Default session not found");
    return;
  }

  const [usersCount, enseignantsCount, elevesCount] = await Promise.all([
    prisma.user.count(),
    prisma.enseignant.count(),
    prisma.eleve.count(),
  ]);

  console.log(
    `Backfilling sessionId to ${usersCount} users, ${enseignantsCount} enseignants, ${elevesCount} eleves...`,
  );

  await prisma.user.updateMany({
    where: { sessionId: null },
    data: { sessionId: defaultSession.id },
  });

  await prisma.enseignant.updateMany({
    where: { sessionId: null },
    data: { sessionId: defaultSession.id },
  });

  await prisma.eleve.updateMany({
    where: { sessionId: null },
    data: { sessionId: defaultSession.id },
  });

  console.log("Backfill complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
