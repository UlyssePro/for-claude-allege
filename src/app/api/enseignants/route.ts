import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, normalizeRole } from "@/lib/auth.actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    const currentUser = sessionToken ? await getCurrentUser(sessionToken) : null;

    const search = request.nextUrl.searchParams.get("search");
    const matiereId = request.nextUrl.searchParams.get("matiereId");
    const categorieId = request.nextUrl.searchParams.get("categorieId");
    const sortBy = request.nextUrl.searchParams.get("sortBy");
    const sortDir = request.nextUrl.searchParams.get("sortDir") || "asc";

    const orderBy: any[] = [];
    if (sortBy === "nom") orderBy.push({ nom: sortDir });
    else if (sortBy === "prenom") orderBy.push({ prenom: sortDir });
    else orderBy.push({ nom: sortDir }, { prenom: sortDir });

    const where: any = {};
    const adminSessionId = request.cookies.get("admin_session_id")?.value;
    if (adminSessionId) {
      where.sessionId = adminSessionId;
    }
    if (matiereId) where.matiereId = matiereId;
    if (categorieId) where.categorieId = categorieId;
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } },
      ];
    }

    const enseignants = await prisma.enseignant.findMany({
      where,
      select: {
        id: true,
        nom: true,
        prenom: true,
        contact: true,
        adresse: true,
        dpservice: true,
        profSess: true,
        matiere: { select: { id: true, label: true, abrev: true } },
        categorie: { select: { id: true, label: true } },
        photo: true,
        handledById: true,
      },
      orderBy,
    });

    const result = enseignants.map((e) => ({
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      contact: e.contact,
      adresse: e.adresse,
      dpservice: e.dpservice,
      profSess: e.profSess,
      matiere: e.matiere,
      categorie: e.categorie,
      photo: e.photo,
      hasUser: Boolean(e.handledById),
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/enseignants error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  const currentUser = sessionToken ? await getCurrentUser(sessionToken) : null;

  if (!currentUser || normalizeRole(currentUser.user.role?.label) !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const sessionId = body.sessionId || request.cookies.get("admin_session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Session requise" }, { status: 400 });
  }

  const ens = await prisma.enseignant.create({
    data: {
      nom: body.nom,
      prenom: body.prenom,
      contact: body.contact || undefined,
      adresse: body.adresse || undefined,
      dpservice: body.dpservice || undefined,
      profSess: body.profSess || undefined,
      matiereId: body.matiereId || null,
      categorieId: body.categorieId || null,
      photo: body.photo || undefined,
      sessionId,
    },
  });

  return NextResponse.json(ens, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Identifiant requis" }, { status: 400 });
  }

  const enseignant = await prisma.enseignant.findUnique({
    where: { id },
    select: { photo: true },
  });

  await prisma.note.deleteMany({ where: { profId: id } });
  await prisma.repartition.deleteMany({ where: { enseignantId: id } });
  await prisma.grilleEmploiTemps.deleteMany({ where: { enseignantId: id } });
  await prisma.trimestre.deleteMany({ where: { enseignantId: id } });
  await prisma.suivi.deleteMany({ where: { enseignantId: id } });

  await prisma.enseignant.delete({
    where: { id },
  });

  if (enseignant?.photo) {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", "uploads", "enseignants", enseignant.photo);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore missing file
    }
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const body = await request.json();

  const ens = await prisma.enseignant.update({
    where: { id },
    data: {
      nom: body.nom,
      prenom: body.prenom,
      contact: body.contact || undefined,
      adresse: body.adresse || undefined,
      dpservice: body.dpservice || undefined,
      profSess: body.profSess || undefined,
      matiereId: body.matiereId || null,
      categorieId: body.categorieId || null,
      photo: body.photo || undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(ens);
}
