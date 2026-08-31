import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const eleve = await prisma.eleve.findFirst({
      where: { handledById: session.user.id },
      select: { id: true, classeId: true, sessionId: true },
    });

    if (!eleve) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const [studentEntries, teacherEntries] = await Promise.all([
      prisma.emploiDuTempsEleve.findMany({
        where: { eleveId: eleve.id },
        include: {
          matiere: { select: { id: true, label: true, abrev: true } },
          classe: { select: { id: true, label: true } },
          sourceGrille: {
            select: {
              enseignantId: true,
              enseignant: { select: { id: true, nom: true, prenom: true } },
            },
          },
        },
        orderBy: [{ jour: "asc" }, { position: "asc" }],
      }),
      prisma.grilleEmploiTemps.findMany({
        where: {
          classeId: eleve.classeId,
          ...(session.user.sessionId
            ? { enseignant: { sessionId: session.user.sessionId } }
            : {}),
          ...(eleve.sessionId
            ? { enseignant: { sessionId: eleve.sessionId } }
            : {}),
        },
        include: {
          matiere: { select: { id: true, label: true, abrev: true } },
          classe: { select: { id: true, label: true } },
          enseignant: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy: [{ jour: "asc" }, { position: "asc" }],
      }),
    ]);

    const merged = new Map<string, any>();

    for (const entry of teacherEntries) {
      const key = `${entry.jour ?? 0}-${entry.position}`;
      merged.set(key, {
        id: entry.id,
        position: entry.position,
        jour: entry.jour ?? 0,
        matiereId: entry.matiereId,
        classeId: entry.classeId,
        enseignantId: entry.enseignantId,
        matiere: entry.matiere
          ? {
              id: entry.matiere.id,
              label: entry.matiere.label,
              abrev: entry.matiere.abrev,
            }
          : null,
        enseignant: entry.enseignant
          ? {
              id: entry.enseignant.id,
              nom: entry.enseignant.nom,
              prenom: entry.enseignant.prenom,
            }
          : null,
        isTeacherEntry: true,
      });
    }

    for (const entry of studentEntries) {
      const key = `${entry.jour ?? 0}-${entry.position}`;
      merged.set(key, {
        id: entry.id,
        position: entry.position,
        jour: entry.jour ?? 0,
        matiereId: entry.matiereId,
        classeId: entry.classeId,
        enseignantId: entry.sourceGrille?.enseignantId || null,
        matiere: entry.matiere
          ? {
              id: entry.matiere.id,
              label: entry.matiere.label,
              abrev: entry.matiere.abrev,
            }
          : null,
        enseignant: entry.sourceGrille?.enseignant
          ? {
              id: entry.sourceGrille.enseignant.id,
              nom: entry.sourceGrille.enseignant.nom,
              prenom: entry.sourceGrille.enseignant.prenom,
            }
          : null,
        isTeacherEntry: false,
      });
    }

    const result = Array.from(merged.values()).sort((a, b) => {
      const keyA = `${a.jour}-${a.position}`;
      const keyB = `${b.jour}-${b.position}`;
      return keyA.localeCompare(keyB);
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/eleve/emploi-du-temps error:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const body = await request.json();
    const { position, matiereId, jour } = body;

    if (!position || !matiereId || jour === undefined) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 },
      );
    }

    const eleve = await prisma.eleve.findFirst({
      where: { handledById: session.user.id },
      select: { id: true, classeId: true },
    });

    if (!eleve) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const matiere = await prisma.matiere.findUnique({
      where: { id: matiereId },
      select: { id: true, label: true, abrev: true },
    });

    if (!matiere) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 });
    }

    const entry = await prisma.emploiDuTempsEleve.create({
      data: {
        eleveId: eleve.id,
        position,
        jour,
        matiereId,
        classeId: eleve.classeId,
      },
      include: {
        matiere: { select: { id: true, label: true, abrev: true } },
        classe: { select: { id: true, label: true } },
      },
    });

    return NextResponse.json({
      id: entry.id,
      position: entry.position,
      jour: entry.jour,
      matiere: { abrev: matiere.abrev },
    });
  } catch (error) {
    console.error("POST /api/eleve/emploi-du-temps error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement", details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const eleve = await prisma.eleve.findFirst({
      where: { handledById: session.user.id },
      select: { id: true },
    });

    if (!eleve) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const entry = await prisma.emploiDuTempsEleve.findFirst({
      where: { id, eleveId: eleve.id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entrée non trouvée" }, { status: 404 });
    }

    await prisma.emploiDuTempsEleve.delete({
      where: { id: entry.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/eleve/emploi-du-temps error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression", details: String(error) },
      { status: 500 },
    );
  }
}
