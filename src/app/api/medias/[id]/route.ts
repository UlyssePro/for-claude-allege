import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";
import { normalizeRole } from "@/lib/auth.actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: mediaId } = await params;

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        url: true,
        thumbnailUrl: true,
        classeId: true,
        enseignantId: true,
        isLive: true,
        isActive: true,
        duration: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!media) {
      return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
    }

    return NextResponse.json({ media });
  } catch (error) {
    console.error("GET /api/medias/[id] error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = normalizeRole(session.user.role?.label);
    if (role !== "prof") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id: mediaId } = await params;
    const body = await request.json();
    const { title, description, type, url, thumbnailUrl, classeId, duration, publishedAt, isLive, isActive } = body as {
      title?: string;
      description?: string;
      type?: string;
      url?: string;
      thumbnailUrl?: string;
      classeId?: string;
      duration?: number;
      publishedAt?: string;
      isLive?: boolean;
      isActive?: boolean;
    };

    const existing = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { id: true, enseignantId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
    }

    if (existing.enseignantId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (type !== undefined) data.type = type;
    if (url !== undefined) data.url = url.trim();
    if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl?.trim() || null;
    if (classeId !== undefined) data.classeId = classeId;
    if (duration !== undefined) data.duration = duration || null;
    if (publishedAt !== undefined) data.publishedAt = publishedAt ? new Date(publishedAt) : new Date();
    if (isLive !== undefined) data.isLive = isLive;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.media.update({
      where: { id: mediaId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        url: true,
        thumbnailUrl: true,
        classeId: true,
        enseignantId: true,
        isLive: true,
        isActive: true,
        duration: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ media: updated });
  } catch (error) {
    console.error("PUT /api/medias/[id] error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = normalizeRole(session.user.role?.label);
    if (role !== "prof") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id: mediaId } = await params;

    const existing = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { id: true, enseignantId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
    }

    if (existing.enseignantId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.media.delete({
      where: { id: mediaId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/medias/[id] error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
