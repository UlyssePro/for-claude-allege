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

    const attempts = await prisma.quizAttempt.findMany({
      where: { eleveId: eleve.id },
      include: { quiz: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("GET /api/eleve/quiz/attempts error", error);
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

    const eleve = await prisma.eleve.findFirst({
      where: { handledById: session.user.id },
      select: { id: true },
    });

    if (!eleve) {
      console.error("POST /api/eleve/quiz/attempts: eleve not found for user", session.user.id);
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { quizId, score, total, answers } = body as {
      quizId: string;
      score: number;
      total: number;
      answers: unknown;
    };

    console.log("POST /api/eleve/quiz/attempts", { eleveId: eleve.id, quizId, score, total, answersType: typeof answers });

    if (!quizId) {
      return NextResponse.json({ error: "quizId requis" }, { status: 400 });
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        eleveId: eleve.id,
        quizId,
        score,
        total,
        answers: answers ?? [],
      },
      include: { quiz: true },
    });

    console.log("POST /api/eleve/quiz/attempts success", { attemptId: attempt.id });
    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("POST /api/eleve/quiz/attempts error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
