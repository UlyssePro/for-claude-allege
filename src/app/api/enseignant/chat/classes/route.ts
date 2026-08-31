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

    if (!enseignant) {
      return NextResponse.json([]);
    }

    const grilleEntries = await prisma.grilleEmploiTemps.findMany({
      where: { enseignantId: enseignant.id, classeId: { not: null } },
      select: { classeId: true },
      distinct: ["classeId"],
    });

    const classeIds = (grilleEntries ?? [])
      .map((g) => g.classeId)
      .filter((id): id is string => Boolean(id));

    const classes = await prisma.classe.findMany({
      where: {
        id: { in: classeIds },
        ...(session.user.sessionId ? {
          eleves: {
            some: { sessionId: session.user.sessionId },
          },
        } : {}),
      },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    });

    return NextResponse.json(
      classes.map((c) => ({
        id: c.id,
        libelle: c.label,
      })),
    );
  } catch (error) {
    console.error("GET /api/enseignant/chat/classes error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
