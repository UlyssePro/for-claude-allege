import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const enseignantId = request.nextUrl.searchParams.get("enseignantId") || undefined;

    const [classes, matieres, trimestres, cahiers] = await Promise.all([
      prisma.classe.findMany({
        select: { id: true, label: true, lieuId: true, lieuEcole: { select: { id: true, taux: true } } },
        orderBy: { label: "asc" },
      }),
      prisma.matiere.findMany({
        select: { id: true, label: true },
        orderBy: { label: "asc" },
      }),
      prisma.trimestre.findMany({
        where: enseignantId ? { enseignantId } : undefined,
        select: { id: true, numero: true, lecon: true, classeId: true, matiereId: true },
        orderBy: { numero: "asc" },
      }),
      prisma.cahier.findMany({
        select: { id: true, trimestreId: true, titre: true, objectif: true, notion: true, exercice: true, pratique: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      classes,
      matieres,
      trimestres,
      cahiers,
      statuts: [
        { value: "NON_FAIT", label: "Non fait" },
        { value: "FAIT", label: "Fait" },
        { value: "VERROUILLE", label: "Verrouillé" },
      ],
    });
  } catch (error) {
    console.error("Failed to load repartition refs", error);
    return NextResponse.json(
      { error: "Failed to load refs" },
      { status: 500 }
    );
  }
}
