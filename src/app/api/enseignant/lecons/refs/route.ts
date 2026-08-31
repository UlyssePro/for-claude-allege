import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [matieres, usualClasses, trimestres, cahiers] = await Promise.all([
      prisma.matiere.findMany({
        select: { id: true, label: true, abrev: true },
        orderBy: { label: "asc" },
      }),
      prisma.usualClasse.findMany({
        select: { id: true, libelle: true },
        orderBy: { libelle: "asc" },
      }),
      prisma.trimestre.findMany({
        select: {
          id: true,
          numero: true,
          lecon: true,
          matiereId: true,
          classeId: true,
          matiere: { select: { id: true, label: true, abrev: true } },
        },
        orderBy: { numero: "asc" },
      }),
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

    return NextResponse.json({ matieres, usualClasses, trimestres, cahiers });
  } catch (error) {
    console.error("Failed to load refs", error);
    return NextResponse.json(
      { error: "Failed to load refs" },
      { status: 500 }
    );
  }
}
