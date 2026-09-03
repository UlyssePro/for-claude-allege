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

    const repartitions = await prisma.repartition.findMany({
      where: {
        enseignantId: enseignant.id,
        pratiqueId: { not: null },
      },
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
      new Set(repartitions.map((r) => r.trimestreId).filter((id): id is string => Boolean(id))),
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

function cleanPratiqueTitle(value: string | null | undefined): string {
  const raw = (value || "").trim();
  return raw.replace(/^Pratique\s*:\s*/i, "").trim() || raw || "-";
}

    const items = repartitions.map((r) => {
      const dateLabel = r.date
        ? new Date(r.date).toLocaleDateString("fr-FR")
        : "-";
      const horaireLabel = r.hourId || "-";
      const classeLabel = r.classe?.label || "-";
      const pratiqueId = r.pratiqueId || null;
      const titre = cleanPratiqueTitle(pratiqueId ? pratiqueLabelById.get(pratiqueId) || "-" : "-");
      const statut = (r.statut || "NON_FAIT").toUpperCase();

      return {
        id: r.id,
        date: dateLabel,
        classe: classeLabel,
        classeId: r.classeId,
        titre,
        pratiqueId,
        horaireLabel,
        lieuLabel: r.lieuEcole?.label || null,
        matiereLabel: r.matiere?.label || null,
        statut,
        debloque: statut === "VERROUILLE",
        task: r.task || null,
      };
    });

    return NextResponse.json({ items, enseignant });
  } catch (error) {
    console.error("GET /api/enseignant/exercices/pratiques error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const body = await request.json();
    const { debloque } = body as { debloque: boolean };

    const repartition = await prisma.repartition.findFirst({
      where: { id, enseignantId: enseignant.id },
      select: { id: true, classeId: true },
    });

    if (!repartition) {
      return NextResponse.json({ error: "Répartition non trouvée" }, { status: 404 });
    }

    const newStatut = debloque ? "VERROUILLE" : "FAIT";

    const updated = await prisma.repartition.updateMany({
      where: { id, enseignantId: enseignant.id },
      data: { statut: newStatut },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Répartition non trouvée" }, { status: 404 });
    }

    if (repartition.classeId) {
      broadcast("exercice-debloque", repartition.classeId, {
        exerciceId: id,
        debloque,
      });
    }

    return NextResponse.json({ success: true, statut: newStatut });
  } catch (error) {
    console.error("PATCH /api/enseignant/exercices/pratiques error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
