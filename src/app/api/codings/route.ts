import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const languageId = searchParams.get("languageId");

    const where = languageId ? { languageId } : {};

    const codings = await prisma.coding.findMany({
      where,
      include: { language: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ codings });
  } catch (error) {
    console.error("GET /api/codings error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { languageId, name, type, element, explication } = body;

    if (!languageId || !element || !explication) {
      return NextResponse.json({ error: "Champs requis" }, { status: 400 });
    }

    const coding = await prisma.coding.create({
      data: {
        languageId,
        name: name || null,
        type: type || "code",
        element,
        explication,
      },
      include: { language: true },
    });

    return NextResponse.json({ coding });
  } catch (error) {
    console.error("POST /api/codings error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
