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

    const eleveId = request.nextUrl.searchParams.get("eleveId");
    if (!eleveId) {
      return NextResponse.json({ error: "eleveId requis" }, { status: 400 });
    }

    let enseignant = await prisma.enseignant.findFirst({
      where: {
        handledById: session.user.id,
        ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
      },
      select: { id: true },
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
        select: { id: true },
      });
    }

    const suivis = await prisma.suivi.findMany({
      where: {
        eleveId,
        ...(enseignant ? { enseignantId: enseignant.id } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(suivis);
  } catch (error) {
    console.error("GET /api/enseignant/suivis error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
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
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let enseignant = await prisma.enseignant.findFirst({
      where: { handledById: session.user.id },
      select: { id: true },
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
        },
        select: { id: true },
      });
    }

    if (!enseignant) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { eleveId, type, resume, detail, noteId, quizAttemptId, exerciceId, cahierId } = body as {
      eleveId: string;
      type: string;
      resume?: string;
      detail?: any;
      noteId?: string;
      quizAttemptId?: string;
      exerciceId?: string;
      cahierId?: string;
    };

    if (!eleveId || !type) {
      return NextResponse.json({ error: "eleveId et type requis" }, { status: 400 });
    }

    const allowedTypes = ["lecon", "exercice", "note", "quiz", "general"];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    const suivi = await prisma.suivi.create({
      data: {
        eleveId,
        enseignantId: enseignant.id,
        type,
        resume: resume || null,
        detail: detail || null,
        noteId: noteId || null,
        quizAttemptId: quizAttemptId || null,
        exerciceId: exerciceId || null,
        cahierId: cahierId || null,
      },
    });

    return NextResponse.json(suivi);
  } catch (error) {
    console.error("POST /api/enseignant/suivis error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
