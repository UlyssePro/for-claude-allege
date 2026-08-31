import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const lieux = await prisma.lieuEcole.findMany({
      select: {
        id: true,
        label: true,
      },
      orderBy: { label: "asc" },
    });

    return NextResponse.json(lieux);
  } catch (e) {
    console.error("GET /api/lieux error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
