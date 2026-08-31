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

  let eleve = await prisma.eleve.findFirst({
    where: {
      handledById: session.user.id,
      ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      photo: true,
      sessionId: true,
      classe: { select: { id: true, label: true, usualClasseId: true } },
      notes: {
        select: {
          id: true,
          note1: true,
          note2: true,
          note3: true,
          note4: true,
          note5: true,
          matiere: { select: { label: true } },
        },
      },
    },
  });

  if (!eleve) {
    return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
  }

  if (eleve.photo) {
    const photoPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "eleves",
      eleve.photo,
    );
    if (!fs.existsSync(photoPath)) {
      eleve.photo = null;
    }
  }

  let usualClasseId = eleve.classe?.usualClasseId || null;
  if (!usualClasseId && eleve.classe?.label) {
    const usualClasses = await prisma.usualClasse.findMany({
      select: { id: true, libelle: true },
    });
    const labelLower = eleve.classe.label.toLowerCase();
    const matched = usualClasses.find(
      (uc) =>
        labelLower.includes(uc.libelle.toLowerCase()) ||
        uc.libelle.toLowerCase().includes(labelLower),
    );
    if (matched) {
      usualClasseId = matched.id;
    }
  }

  let sessionLabelValue = null;
  if (eleve.sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: eleve.sessionId },
      select: { id: true, label: true },
    });
    sessionLabelValue = session;
  }

  return NextResponse.json({
    ...eleve,
    classe: eleve.classe
      ? {
          ...eleve.classe,
          usualClasseId,
        }
      : null,
    session: sessionLabelValue,
  });
}
