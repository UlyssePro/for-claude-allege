import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const genres = await prisma.genreEleve.findMany({
    select: { id: true, label: true, gen: true },
  });
  return NextResponse.json(genres);
}
