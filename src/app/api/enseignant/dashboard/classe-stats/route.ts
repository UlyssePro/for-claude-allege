import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

function getSchoolYearLabel(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 8) {
    return `${String(year).slice(2)}-${String(year + 1).slice(2)}`;
  }
  return `${String(year - 1).slice(2)}-${String(year).slice(2)}`;
}

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

    const annee = getSchoolYearLabel(new Date());

    const entries = await prisma.grilleEmploiTemps.findMany({
      where: { enseignantId: enseignant.id, annee },
      select: {
        classeId: true,
      },
    });

    const uniqueClasseIds = Array.from(new Set(entries.map((e) => e.classeId).filter(Boolean)));

    const classes = await prisma.classe.findMany({
      where: {
        id: { in: uniqueClasseIds },
        ...(session.user.sessionId ? {
          eleves: {
            some: { sessionId: session.user.sessionId },
          },
        } : {}),
      },
      select: {
        id: true,
        label: true,
        _count: { select: { eleves: true } },
      },
    });

    const classesList = classes.map((c) => ({
      id: c.id,
      label: c.label,
      elevesCount: c._count.eleves || 0,
    }));

    return NextResponse.json({ classes: classesList });
  } catch (error) {
    console.error("GET /api/enseignant/dashboard/classe-stats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
