import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  try {
    const languages = await prisma.language.findMany({
      orderBy: { label: "asc" },
    });

    return NextResponse.json({ languages });
  } catch (error) {
    console.error("GET /api/languages error", error);
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
    const { label, code } = body;

    if (!label || !code) {
      return NextResponse.json({ error: "Label et code requis" }, { status: 400 });
    }

    const language = await prisma.language.create({
      data: { label, code },
    });

    return NextResponse.json({ language });
  } catch (error) {
    console.error("POST /api/languages error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
