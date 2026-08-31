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

    const teacherClasseIds = await prisma.grilleEmploiTemps.findMany({
      where: { enseignantId: enseignant.id, classeId: { not: null } },
      select: { classeId: true },
      distinct: ["classeId"],
    });

    const allowedClasseIds = teacherClasseIds.map((r) => r.classeId).filter((id): id is string => !!id);

    const activations = await prisma.quizActivation.findMany({
      where: allowedClasseIds.length > 0 ? { usualClasseId: { in: allowedClasseIds } } : undefined,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ activations });
  } catch (error) {
    console.error("GET /api/enseignant/quiz/activation error", error);
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

    const body = await request.json();
    const { usualClasseId, enabled } = body as {
      usualClasseId: string;
      enabled: boolean;
    };

    if (!usualClasseId) {
      return NextResponse.json({ error: "usualClasseId requis" }, { status: 400 });
    }

    const activation = await prisma.quizActivation.upsert({
      where: { usualClasseId },
      update: { enabled },
      create: { usualClasseId, enabled: enabled ?? true },
    });

    try {
      const wsUrl = process.env.WS_URL || "http://localhost:3001";
      await fetch(`${wsUrl}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "quiz-activation-changed",
          room: usualClasseId,
          payload: { enabled: activation.enabled },
        }),
      });
    } catch (error) {
      console.error("Failed to broadcast activation:", error);
    }

    return NextResponse.json({ activation });
  } catch (error) {
    console.error("POST /api/enseignant/quiz/activation error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
