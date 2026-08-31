import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

function getParentPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "/");
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/");
}

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
    const classeId = searchParams.get("classeId");
    const ownerId = searchParams.get("ownerId");

    if (path) {
      const file = await prisma.codeFile.findFirst({
        where: { path },
      });

      if (!file) {
        return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
      }

      return NextResponse.json({ file });
    }

    const where: any = {};
    if (classeId) {
      where.classeId = classeId;
    }
    if (ownerId) {
      where.ownerId = ownerId;
    }

    const files = await prisma.codeFile.findMany({
      where: {
        ...(classeId || ownerId
          ? {
              OR: [
                ...(classeId ? [{ classeId }] : []),
                ...(ownerId ? [{ ownerId }] : []),
              ],
            }
          : {
              ownerId: session.user.id,
            }),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("GET /api/code error", error);
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
    const { name, path, content, language, isFolder, parentPath, classeId } = body;

    if (!name || !path) {
      return NextResponse.json({ error: "Nom et chemin requis" }, { status: 400 });
    }

    const file = await prisma.codeFile.create({
      data: {
        name,
        path,
        content: content || "",
        language,
        isFolder: isFolder || false,
        parentPath: parentPath || null,
        ownerId: session.user.id,
        ...(classeId ? { classeId } : {}),
      },
      select: {
        id: true,
        name: true,
        path: true,
        content: true,
        language: true,
        isFolder: true,
        parentPath: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error("POST /api/code error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { path, name, content, language } = body;

    if (!path) {
      return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
    }

    const existing = await prisma.codeFile.findFirst({
      where: { path },
    });

    if (!existing) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name;
      const parentPath = existing.parentPath || getParentPath(existing.path);
      updateData.path = parentPath + "/" + name;
    }
    if (content !== undefined) updateData.content = content;
    if (language !== undefined) updateData.language = language;

    const file = await prisma.codeFile.update({
      where: { id: existing.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        path: true,
        content: true,
        language: true,
        isFolder: true,
        parentPath: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error("PUT /api/code error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const existing = await prisma.codeFile.findFirst({
      where: { path },
    });

    if (!existing) {
      return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
    }

    await prisma.codeFile.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/code error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
