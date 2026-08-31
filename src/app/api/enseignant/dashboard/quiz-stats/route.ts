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

    const [totalQuiz, quizByDifficulty, attempts] = await Promise.all([
      prisma.quiz.count({
        where: { enseignantId: enseignant.id },
      }),
      prisma.quiz.groupBy({
        by: ["difficulte"],
        where: { enseignantId: enseignant.id },
        _count: { _all: true },
      }),
      prisma.quizAttempt.aggregate({
        where: { quiz: { enseignantId: enseignant.id } },
        _avg: { score: true },
      }),
    ]);

    const parDifficulte = [1, 2, 3].map((d) => ({
      difficulte: d,
      count: quizByDifficulty.find((q) => q.difficulte === d)?._count._all || 0,
    }));

    const tauxReussite = attempts._avg.score
      ? Math.round((attempts._avg.score / 10) * 100)
      : null;

    return NextResponse.json({
      totalQuiz,
      parDifficulte,
      tauxReussite,
    });
  } catch (error) {
    console.error("GET /api/enseignant/dashboard/quiz-stats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
