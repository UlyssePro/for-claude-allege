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
        },
        select: { id: true, matiereId: true },
      });
    }

    if (!enseignant) {
      return NextResponse.json({ current: null });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const currentEntry = await prisma.grilleEmploiTemps.findFirst({
      where: {
        enseignantId: enseignant.id,
        classeId: { not: null },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        position: "asc",
      },
      select: {
        classeId: true,
        classe: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });

    if (!currentEntry || !currentEntry.classeId || !currentEntry.classe) {
      const firstEntry = await prisma.grilleEmploiTemps.findFirst({
        where: {
          enseignantId: enseignant.id,
          classeId: { not: null },
        },
        orderBy: {
          position: "asc",
        },
        select: {
          classeId: true,
          classe: {
            select: {
              id: true,
              label: true,
            },
          },
        },
      });

      if (firstEntry?.classeId && firstEntry.classe) {
        return NextResponse.json({
          current: {
            id: firstEntry.classe.id,
            libelle: firstEntry.classe.label,
          },
        });
      }

      return NextResponse.json({ current: null });
    }

    return NextResponse.json({
      current: {
        id: currentEntry.classe.id,
        libelle: currentEntry.classe.label,
      },
    });
  } catch (error) {
    console.error("GET /api/enseignant/chat/current error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
