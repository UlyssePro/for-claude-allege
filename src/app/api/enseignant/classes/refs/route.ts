import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [categories, lieux] = await Promise.all([
    prisma.classeCategorie.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
    prisma.lieuEcole.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
  ]);

  return NextResponse.json({ categories, lieux });
}
