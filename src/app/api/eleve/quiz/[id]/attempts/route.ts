import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
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

    const params = await props.params;
    const quizId = params.id;

    const attempts = await prisma.quizAttempt.findMany({
      where: { eleveId: eleve.id, quizId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        score: true,
        total: true,
        answers: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("GET /api/eleve/quiz/[id]/attempts error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
