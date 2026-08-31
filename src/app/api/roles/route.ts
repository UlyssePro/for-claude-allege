import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error("GET /api/roles error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
  }
}
