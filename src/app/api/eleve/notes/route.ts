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
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const eleve = await prisma.eleve.findFirst({
      where: { handledById: session.user.id },
      select: { id: true },
    });

    if (!eleve) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const notes = await prisma.note.findMany({
      where: { eleveId: eleve.id },
      select: {
        id: true,
        note1: true,
        note2: true,
        note3: true,
        note4: true,
        note5: true,
        eleve: { select: { numero: true } },
        matiere: { select: { id: true, label: true, abrev: true } },
        prof: { select: { id: true, prenom: true, nom: true } },
      },
      orderBy: { matiere: { label: "asc" } },
    });

    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        note1: n.note1,
        note2: n.note2,
        note3: n.note3,
        note4: n.note4,
        note5: n.note5,
        numero: n.eleve?.numero ?? null,
        matiere: n.matiere,
        prof: n.prof,
      })),
    });
  } catch (error) {
    console.error("GET /api/eleve/notes error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
