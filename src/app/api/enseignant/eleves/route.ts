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

  const edtEntries = await prisma.grilleEmploiTemps.findMany({
    where: {
      enseignantId: enseignant.id,
      classeId: { not: null },
    },
    select: { classeId: true },
    distinct: ["classeId"],
  });

  let ids = edtEntries.map((r) => r.classeId).filter((id): id is string => !!id);

  const classeId = request.nextUrl.searchParams.get("classeId");
  const genreId = request.nextUrl.searchParams.get("genreId");

  if (classeId) {
    ids = ids.filter((id) => id === classeId);
  }

  const where: any = {};
  if (session.user.sessionId) {
    where.sessionId = session.user.sessionId;
  }
  if (ids.length > 0) {
    where.classeId = { in: ids };
  } else if (classeId) {
    where.classeId = classeId;
  }
  if (genreId) {
    where.genreId = genreId;
  }

  const eleves = await prisma.eleve.findMany({
    where,
    select: {
      id: true,
      firstname: true,
      lastname: true,
      numero: true,
      contact: true,
      dob: true,
      photo: true,
      sob: true,
      domic: true,
      obs: true,
      classe: { select: { id: true, label: true } },
      genre: { select: { id: true, label: true, gen: true } },
    },
    orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
  });

  return NextResponse.json(eleves);
}
