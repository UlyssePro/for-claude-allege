import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [classes, matieres, enseignants, lieux] = await Promise.all([
    prisma.classe.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
    prisma.matiere.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
    prisma.enseignant.findMany({ select: { id: true, nom: true, prenom: true }, orderBy: { nom: "asc" } }),
    prisma.lieuEcole.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
  ]);

  return NextResponse.json({
    classes,
    matieres,
    enseignants,
    lieux,
    statuts: [
      { value: "NON_FAIT", label: "Non fait" },
      { value: "FAIT", label: "Fait" },
      { value: "VERROUILLE", label: "Verrouillé" },
    ],
  });
}
