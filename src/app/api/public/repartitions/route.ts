import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const classeId = request.nextUrl.searchParams.get("classeId");
  const matiereId = request.nextUrl.searchParams.get("matiereId");
  const enseignantId = request.nextUrl.searchParams.get("enseignantId");

  const where: any = {};
  if (classeId && classeId !== "all") where.classeId = classeId;
  if (matiereId && matiereId !== "all") where.matiereId = matiereId;
  if (enseignantId && enseignantId !== "all") where.enseignantId = enseignantId;

  if (Object.keys(where).length === 0) {
    return NextResponse.json({ error: "Au moins un filtre est requis" }, { status: 400 });
  }

  const repartitions = await prisma.repartition.findMany({
    where,
    select: {
      id: true,
      date: true,
      position: true,
      statut: true,
      taux: true,
      trimestreId: true,
      titreId: true,
      objectifId: true,
      notionId: true,
      exerciceId: true,
      pratiqueId: true,
      hourId: true,
      lieuId: true,
      matiereId: true,
      enseignantId: true,
      classeId: true,
      matiere: { select: { id: true, label: true, abrev: true } },
      enseignant: { select: { id: true, nom: true, prenom: true } },
      classe: { select: { id: true, label: true } },
      lieuEcole: { select: { id: true, label: true } },
    },
    orderBy: [{ date: "asc" }, { position: "asc" }],
  });

  const trimestreIds = Array.from(new Set(repartitions.map((r) => r.trimestreId).filter((id): id is string => !!id)));
  const [trimestres, cahiers] = await Promise.all([
    trimestreIds.length > 0 ? prisma.trimestre.findMany({
      where: { id: { in: trimestreIds } },
      select: { id: true, numero: true, lecon: true },
    }) : Promise.resolve([]),
    prisma.cahier.findMany({
      select: {
        id: true,
        trimestreId: true,
        titre: true,
        objectif: true,
        notion: true,
        exercice: true,
        pratique: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const trimestreMap = new Map(trimestres.map((t) => [t.id, `${t.numero} - ${t.lecon}`]));

  const parseJsonObjects = (value: unknown): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        return [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const findLabel = (items: any[], id: string | null | undefined): string => {
    if (!id) return "-";
    const item = items.find((i: any) => String(i.id) === String(id));
    return item?.label || String(id);
  };

  const enriched = repartitions.map((r) => {
    const relatedCahiers = cahiers.filter((c) => c.trimestreId === r.trimestreId);
    const titres = relatedCahiers.flatMap((c) => parseJsonObjects(c.titre));
    const objectifs = relatedCahiers.flatMap((c) => parseJsonObjects(c.objectif));
    const notions = relatedCahiers.flatMap((c) => parseJsonObjects(c.notion));
    const exercices = relatedCahiers.flatMap((c) => parseJsonObjects(c.exercice));
    const pratiques = relatedCahiers.flatMap((c) => parseJsonObjects(c.pratique));

    return {
      ...r,
      trimestreLabel: r.trimestreId ? (trimestreMap.get(r.trimestreId) || "-") : "-",
      titreLabel: findLabel(titres, r.titreId),
      objectifLabel: findLabel(objectifs, r.objectifId),
      notionLabel: findLabel(notions, r.notionId),
      exerciceLabel: findLabel(exercices, r.exerciceId),
      pratiqueLabel: findLabel(pratiques, r.pratiqueId),
    };
  });

  return NextResponse.json(enriched);
}
