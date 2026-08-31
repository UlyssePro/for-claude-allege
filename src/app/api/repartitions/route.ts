import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search");
    const classeId = request.nextUrl.searchParams.get("classeId");
    const matiereId = request.nextUrl.searchParams.get("matiereId");
    const enseignantId = request.nextUrl.searchParams.get("enseignantId");
    const lieuId = request.nextUrl.searchParams.get("lieuId");
    const horaireId = request.nextUrl.searchParams.get("horaireId");
    const semaineId = request.nextUrl.searchParams.get("semaineId");
    const statut = request.nextUrl.searchParams.get("statut");
    const sortBy = request.nextUrl.searchParams.get("sortBy");
    const sortDir = request.nextUrl.searchParams.get("sortDir") || "asc";

    const orderBy: any[] = [];
    if (sortBy === "date") orderBy.push({ date: sortDir });
    else if (sortBy === "position") orderBy.push({ position: sortDir });
    else if (sortBy === "matiere") orderBy.push({ matiere: { label: sortDir } });
    else if (sortBy === "enseignant") orderBy.push({ enseignant: { nom: sortDir } });
    else if (sortBy === "classe") orderBy.push({ classe: { label: sortDir } });
    else if (sortBy === "lieu") orderBy.push({ lieuEcole: { label: sortDir } });
    else if (sortBy === "statut") orderBy.push({ statut: sortDir });
    else orderBy.push({ date: "desc" }, { position: "asc" });

    const where: any = {};
    const adminSessionId = request.cookies.get("admin_session_id")?.value;

    if (adminSessionId) {
      where.enseignant = { sessionId: adminSessionId };
    }

    if (classeId) where.classeId = classeId;
    if (matiereId) where.matiereId = matiereId;
    if (enseignantId) where.enseignantId = enseignantId;
    if (lieuId) where.lieuId = lieuId;
    if (horaireId) where.horaireId = horaireId;
    if (semaineId) where.semaineId = semaineId;
    if (statut) where.statut = statut;

    if (search) {
      where.OR = [
        { matiere: { label: { contains: search } } },
        { enseignant: { nom: { contains: search } } },
        { enseignant: { prenom: { contains: search } } },
        { classe: { label: { contains: search } } },
      ];
    }

    const repartitions = await prisma.repartition.findMany({
      where,
      select: {
        id: true,
        numItem: true,
        date: true,
        position: true,
        taux: true,
        statut: true,
        matiere: { select: { label: true, abrev: true } },
        enseignant: { select: { nom: true, prenom: true } },
        classe: { select: { label: true } },
        lieuEcole: { select: { label: true } },
      },
      orderBy,
    });

    return NextResponse.json(repartitions);
  } catch (e) {
    console.error("GET /api/repartitions error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.statut !== undefined) data.statut = body.statut;

  const repartition = await prisma.repartition.update({
    where: { id },
    data,
  });
  return NextResponse.json(repartition);
}
