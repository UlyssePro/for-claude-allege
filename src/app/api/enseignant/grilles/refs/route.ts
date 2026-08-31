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
    select: {
      id: true,
      prenom: true,
      nom: true,
      matiereId: true,
      categorieId: true,
      matiere: { select: { id: true, label: true } },
    },
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
      select: {
        id: true,
        prenom: true,
        nom: true,
        matiereId: true,
        categorieId: true,
        matiere: { select: { id: true, label: true } },
      },
    });
  }

  if (!enseignant) {
    return NextResponse.json(
      { error: "Enseignant non trouvé" },
      { status: 404 },
    );
  }

  const [classes, lieux, assignedClasseIds, usualClasses] = await Promise.all([
    prisma.classe.findMany({
      where: session.user.sessionId ? {
        eleves: {
          some: { sessionId: session.user.sessionId },
        },
      } : undefined,
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
    prisma.lieuEcole.findMany({
      select: { id: true, label: true, taux: true },
      orderBy: { label: "asc" },
    }),
    prisma.grilleEmploiTemps.findMany({
      where: { enseignantId: enseignant.id, classeId: { not: null } },
      select: { classeId: true },
      distinct: ["classeId"],
    }),
    prisma.usualClasse.findMany({
      select: { id: true, libelle: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const assignedClasseIdSet = new Set(
    (assignedClasseIds ?? []).map((g) => g.classeId).filter(Boolean),
  );

  const timetableClasses =
    assignedClasseIdSet.size > 0
      ? classes.filter((c) => assignedClasseIdSet.has(c.id))
      : [];

  return NextResponse.json({
    classes: timetableClasses,
    lieux,
    matiere: enseignant.matiere
      ? { id: enseignant.matiere.id, label: enseignant.matiere.label }
      : null,
    usualClasses,
    enseignant: {
      id: enseignant.id,
      prenom: enseignant.prenom,
      nom: enseignant.nom,
    },
  });
}
