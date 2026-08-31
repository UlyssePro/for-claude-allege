import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

const WS_URL = process.env.WS_URL || "http://localhost:3001";

async function broadcast(event: string, room: string, payload: any) {
  try {
    await fetch(`${WS_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, room, payload }),
    });
  } catch {
    // ignore
  }
}

function parseJsonField(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
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

    const eleve = await prisma.eleve.findFirst({
      where: { handledById: session.user.id },
      select: { id: true, classeId: true },
    });

    if (!eleve) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const where: any = {};
    if (eleve.classeId) {
      where.classeId = eleve.classeId;
    }

    const repartitions = await prisma.repartition.findMany({
      where: { ...where, pratiqueId: { not: null } },
      select: {
        id: true,
        date: true,
        position: true,
        trimestreId: true,
        titreId: true,
        objectifId: true,
        notionId: true,
        exerciceId: true,
        pratiqueId: true,
        classeId: true,
        classe: { select: { label: true } },
        hourId: true,
        lieuId: true,
        lieuEcole: { select: { label: true } },
        matiere: { select: { label: true } },
        statut: true,
        createdAt: true,
        task: true,
      },
      orderBy: [{ date: "asc" }, { position: "asc" }],
    });

    const trimestreIds = Array.from(
      new Set(repartitions.map((r) => r.trimestreId).filter(Boolean)),
    );

    const cahiers = trimestreIds.length
      ? await prisma.cahier.findMany({
          where: { trimestreId: { in: trimestreIds } },
          select: { id: true, trimestreId: true, pratique: true },
        })
      : [];

    const pratiquesByCahier = new Map<string, any[]>();
    for (const cahier of cahiers) {
      const raw = cahier.pratique;
      let items: any[] = [];
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        // ignore
      }
      pratiquesByCahier.set(cahier.id, items);
    }

    const trimestreCahierIds = new Map<string, string>();
    for (const cahier of cahiers) {
      trimestreCahierIds.set(cahier.trimestreId, cahier.id);
    }

    const pratiqueLabelById = new Map<string, string>();
    for (const [, items] of pratiquesByCahier.entries()) {
      for (const item of items) {
        if (item?.id) {
          pratiqueLabelById.set(String(item.id), item.label || String(item.id));
        }
      }
    }

    const suivis = await prisma.suiviRepartition.findMany({
      where: { eleveId: eleve.id },
    });
    const suivisMap = new Map(suivis.map((s) => [s.repartitionId, s]));

function cleanPratiqueTitle(value: string | null | undefined): string {
  const raw = (value || "").trim();
  return raw.replace(/^Pratique\s*:\s*/i, "").trim() || raw || "-";
}

    const items = repartitions.map((r) => {
      const pratiqueId = r.pratiqueId || null;
      const titre = cleanPratiqueTitle(pratiqueId ? pratiqueLabelById.get(pratiqueId) || "-" : "-");
      const suivi = suivisMap.get(r.id);
      const dateExercice = r.date
        ? new Date(r.date).toISOString().slice(0, 10)
        : null;
      const debloque = (r.statut || "NON_FAIT").toUpperCase() === "VERROUILLE";

      return {
        id: r.id,
        titre: titre || r.matiere?.label || "-",
        consigne: "",
        difficulte: 1,
        classe: r.classe?.label ?? null,
        dateExercice,
        createdAt: r.createdAt,
        debloque,
        fait: suivi?.fait ?? false,
        note: suivi?.note ?? null,
        reponse: suivi?.reponse ?? null,
        task: r.task || null,
      };
    });

    return NextResponse.json({ exercices: items });
  } catch (error) {
    console.error("GET /api/eleve/exercices error:", error);
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
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { repartitionId, reponse } = body as { repartitionId: string; reponse?: string };

    if (!repartitionId) {
      return NextResponse.json({ error: "repartitionId requis" }, { status: 400 });
    }

    if (!reponse || !reponse.trim()) {
      return NextResponse.json({ error: "Réponse requise" }, { status: 400 });
    }

    const repartition = await prisma.repartition.findFirst({
      where: { id: repartitionId },
      select: { id: true, enseignantId: true, classeId: true, statut: true },
    });

    if (!repartition) {
      return NextResponse.json({ error: "Répartition non trouvée" }, { status: 404 });
    }

    if (repartition.statut !== "VERROUILLE") {
      return NextResponse.json({ error: "Pratique non débloquée" }, { status: 403 });
    }

    const suivi = await prisma.suiviRepartition.upsert({
      where: {
        repartitionId_eleveId: {
          repartitionId,
          eleveId: eleve.id,
        },
      },
      update: {
        fait: true,
        reponse: reponse.trim(),
      },
      create: {
        repartitionId,
        eleveId: eleve.id,
        fait: true,
        reponse: reponse.trim(),
      },
    });

    if (repartition.enseignantId) {
      broadcast("exercice-termine", repartition.enseignantId, {
        exerciceId: repartitionId,
        eleveId: eleve.id,
      });
    }

    return NextResponse.json(suivi);
  } catch (error) {
    console.error("POST /api/eleve/exercices error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
