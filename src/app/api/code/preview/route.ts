import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
    }

    const file = await prisma.codeFile.findFirst({
      where: { path },
      select: {
        content: true,
        name: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    const html = file.content || "";

    const isHtml = path.endsWith(".html") || path.endsWith(".htm");

    if (isHtml) {
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return NextResponse.json({ content: html, name: file.name });
  } catch (error) {
    console.error("GET /api/code/preview error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
