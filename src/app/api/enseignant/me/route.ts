import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";
import fs from "fs";
import path from "path";

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
      nom: true,
      prenom: true,
      contact: true,
      adresse: true,
      dpservice: true,
      profSess: true,
      photo: true,
      sessionId: true,
      matiere: { select: { id: true, label: true } },
      categorie: { select: { id: true, label: true } },
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
        nom: true,
        prenom: true,
        contact: true,
        adresse: true,
        dpservice: true,
        profSess: true,
        photo: true,
        sessionId: true,
        matiere: { select: { id: true, label: true } },
        categorie: { select: { id: true, label: true } },
      },
    });
  }

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  if (enseignant.photo) {
    const photoPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "enseignants",
      enseignant.photo,
    );
    if (!fs.existsSync(photoPath)) {
      enseignant.photo = null;
    }
  }

  const repartitions = await prisma.repartition.findMany({
    where: { enseignantId: enseignant.id },
    select: {
      id: true,
      numItem: true,
      date: true,
      position: true,
      taux: true,
      statut: true,
      matiere: { select: { label: true, abrev: true } },
      classe: { select: { label: true } },
      lieuEcole: { select: { label: true } },
    },
    orderBy: [{ date: "desc" }, { position: "asc" }],
  });

  return NextResponse.json({
    enseignant,
    repartitions,
  });
}
