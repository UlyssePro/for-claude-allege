import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

const WS_URL = process.env.WS_URL || "http://localhost:3001";

async function broadcast(event: string, room: string, payload: any) {
  try {
    const res = await fetch(`${WS_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, room, payload }),
    });
    console.log("[broadcast]", event, room, payload, res.status);
  } catch (error) {
    console.error(`Failed to broadcast ${event}:`, error);
  }
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
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const repartitionId = request.nextUrl.searchParams.get("repartitionId");
    if (!repartitionId) {
      return NextResponse.json({ error: "repartitionId requis" }, { status: 400 });
    }

    const repartition = await prisma.repartition.findFirst({
      where: { id: repartitionId, enseignantId: enseignant.id },
      select: { id: true, classeId: true },
    });

    if (!repartition) {
      return NextResponse.json({ error: "Répartition non trouvée" }, { status: 404 });
    }

    if (!repartition.classeId) {
      return NextResponse.json({ eleves: [] });
    }

    const eleves = await prisma.eleve.findMany({
      where: {
        classeId: repartition.classeId,
        ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
      },
      select: { id: true, firstname: true, lastname: true },
      orderBy: { lastname: "asc" },
    });

    const suivis = await prisma.suiviRepartition.findMany({
      where: { repartitionId },
    });

    const suivisMap = new Map(suivis.map((s) => [s.eleveId, s]));

    const result = eleves.map((eleve) => {
      const suivi = suivisMap.get(eleve.id);
      return {
        id: eleve.id,
        firstname: eleve.firstname,
        lastname: eleve.lastname,
        fait: suivi?.fait ?? false,
        note: suivi?.note ?? null,
        reponse: suivi?.reponse ?? null,
      };
    });

    console.log("[enseignant/exercices/suivis GET] result", result);
    return NextResponse.json({ eleves: result });
  } catch (error) {
    console.error("GET /api/enseignant/exercices/suivis error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { repartitionId, eleves } = body as {
      repartitionId: string;
      eleves: { eleveId: string; fait: boolean; note?: string }[];
    };

    if (!repartitionId || !Array.isArray(eleves)) {
      return NextResponse.json({ error: "repartitionId et eleves requis" }, { status: 400 });
    }

    const repartition = await prisma.repartition.findFirst({
      where: { id: repartitionId, enseignantId: enseignant.id },
      select: { id: true, enseignantId: true, classeId: true },
    });

    if (!repartition) {
      return NextResponse.json({ error: "Répartition non trouvée" }, { status: 404 });
    }

    await prisma.$transaction(
      eleves.map((item) =>
        prisma.suiviRepartition.upsert({
          where: {
            repartitionId_eleveId: {
              repartitionId,
              eleveId: item.eleveId,
            },
          },
          update: {
            fait: item.fait,
            note: item.note || null,
          },
          create: {
            repartitionId,
            eleveId: item.eleveId,
            fait: item.fait,
            note: item.note || null,
          },
        }),
      ),
    );

    for (const item of eleves) {
      broadcast("exercice-corrige", item.eleveId, { exerciceId: repartitionId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/enseignant/exercices/suivis error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
