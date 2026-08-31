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

    const classes = await prisma.classe.findMany({
      where: {
        grillesEmploiTemps: {
          some: {
            enseignantId: enseignant.id,
            classeId: { not: null },
          },
        },
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
      orderBy: { label: "asc" },
    });

    const totalEleves = classes.reduce((sum, c) => sum + (c._count.eleves || 0), 0);

    return NextResponse.json({
      classesCount: classes.length,
      totalEleves,
      classes: classes.map((c) => ({
        id: c.id,
        label: c.label,
        elevesCount: c._count.eleves || 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/enseignant/dashboard/eleves-stats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
