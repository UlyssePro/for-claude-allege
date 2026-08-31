import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [categories, types] = await Promise.all([
    prisma.classeCategorie.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
    prisma.usualClasse.findMany({ select: { id: true, libelle: true }, orderBy: { libelle: "asc" } }),
  ]);
  return NextResponse.json({ types, categories });
}
