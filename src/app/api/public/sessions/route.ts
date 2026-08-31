import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { label: "asc" },
      select: { id: true, label: true },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("GET /api/public/sessions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
