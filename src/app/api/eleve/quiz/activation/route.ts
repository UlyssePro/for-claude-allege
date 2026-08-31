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

    const queryUsualClasseId = request.nextUrl.searchParams.get("usualClasseId");

    const eleve = await prisma.eleve.findFirst({
      where: { handledById: session.user.id },
      select: {
        id: true,
        classe: { select: { id: true, label: true, usualClasseId: true } },
      },
    });

    if (!eleve) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    let usualClasseId = queryUsualClasseId || eleve.classe?.usualClasseId || "";

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

    if (!usualClasseId) {
      return NextResponse.json({ enabled: false });
    }

    const activation = await prisma.quizActivation.findUnique({
      where: { usualClasseId },
      select: { enabled: true },
    });

    return NextResponse.json({ enabled: activation?.enabled ?? false });
  } catch (error) {
    console.error("GET /api/eleve/quiz/activation error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
