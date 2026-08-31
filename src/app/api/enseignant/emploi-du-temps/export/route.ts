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

  const enseignant = await prisma.enseignant.findFirst({
    where: { handledById: session.user.id },
    select: { id: true, prenom: true, nom: true, matiereId: true },
  });

  if (!enseignant) {
    return NextResponse.json(
      { error: "Enseignant non trouvé" },
      { status: 404 },
    );
  }

  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate et endDate sont requis" },
      { status: 400 },
    );
  }

  const entries = await prisma.grilleEmploiTemps.findMany({
    where: {
      enseignantId: enseignant.id,
      date: { gte: new Date(startDate), lte: new Date(endDate) },
      classeId: { not: null },
    },
    select: {
      id: true,
      date: true,
      position: true,
      classeId: true,
      horaireId: true,
      classe: { select: { label: true } },
    },
    orderBy: [{ date: "asc" }, { position: "asc" }],
  });

  return NextResponse.json({
    entries,
    enseignant,
  });
}
