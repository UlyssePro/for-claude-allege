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
      select: {
        id: true,
        classe: {
          select: {
            label: true,
            usualClasseId: true,
          },
        },
      },
    });

    if (!eleve) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const classeLabel = eleve.classe?.label || "";
    const usualClasseId = eleve.classe?.usualClasseId || "";

    const activation = usualClasseId
      ? await prisma.quizActivation.findUnique({
          where: { usualClasseId },
          select: { enabled: true },
        })
      : null;

    const where: Record<string, string> = {};
    if (usualClasseId && activation?.enabled) {
      where.usualClasseId = usualClasseId;
    }

    const quizs = await prisma.quiz.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        question: true,
        reponse: true,
        difficulte: true,
        done: true,
        classe: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ quizs, classeLabel });
  } catch (error) {
    console.error("GET /api/eleve/quiz error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
