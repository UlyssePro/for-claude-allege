import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const session = await getCurrentUser(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let enseignant = await prisma.enseignant.findFirst({
    where: {
      handledById: session.user.id,
      ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
    },
    select: { id: true, matiereId: true },
  });

  if (!enseignant && session.user.username) {
    const fullName = session.user.username.trim();
    const parts = fullName.split(" ");
    const prenom = parts[0] || "";
    const nom = parts[1] || "";

    enseignant = await prisma.enseignant.findFirst({
      where: {
        OR: [
          { prenom, nom },
          { prenom: { contains: fullName } },
          { nom: { contains: fullName } },
        ],
        ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
      },
      select: { id: true, matiereId: true },
    });
  }

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  const edtClasseIds = await prisma.grilleEmploiTemps.findMany({
    where: {
      enseignantId: enseignant.id,
      classeId: { not: null },
    },
    select: { classeId: true },
    distinct: ["classeId"],
  });

  let classeIds = edtClasseIds.map((r) => r.classeId).filter((id): id is string => !!id);

  const [classes, genres] = await Promise.all([
    classeIds.length > 0
      ? prisma.classe.findMany({
          where: { id: { in: classeIds } },
          select: { id: true, label: true },
          orderBy: { label: "asc" },
        })
      : [],
    prisma.genreEleve.findMany({
      select: { id: true, label: true, gen: true },
      orderBy: { label: "asc" },
    }),
  ]);

  return NextResponse.json({ classes, genres });
}
