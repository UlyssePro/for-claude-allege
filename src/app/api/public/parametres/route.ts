import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const cle = request.nextUrl.searchParams.get("cle");
    if (!cle) {
      return NextResponse.json({ error: "cle requis" }, { status: 400 });
    }

    const parametre = await prisma.parametre.findUnique({
      where: { cle },
      select: { valeur: true },
    });

    if (!parametre) {
      return NextResponse.json({ error: "Paramètre non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ valeur: parametre.valeur });
  } catch (error) {
    console.error("GET /api/public/parametres error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
