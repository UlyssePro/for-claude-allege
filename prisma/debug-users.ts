import { prisma } from "../src/lib/prisma";

async function main() {
  const sessions = await prisma.session.findMany({
    select: { id: true, label: true },
  });
  console.log("SESSIONS:", sessions);

  const enseignants = await prisma.enseignant.findMany({
    select: { id: true, prenom: true, nom: true, sessionId: true, handledById: true },
  });
  console.log("ENSEIGNANTS:", enseignants);

  const users = await prisma.user.findMany({
    where: { logged: true },
    select: { id: true, username: true, sessionId: true, role: { select: { label: true } } },
  });
  console.log("LOGGED IN USERS:", users);
}

main().catch(console.error);
