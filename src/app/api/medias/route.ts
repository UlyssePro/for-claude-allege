import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";
import { normalizeRole } from "@/lib/auth.actions";

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

    const classeId = request.nextUrl.searchParams.get("classeId");
    const type = request.nextUrl.searchParams.get("type");
    const search = request.nextUrl.searchParams.get("search");
    const sortBy = request.nextUrl.searchParams.get("sortBy") || "publishedAt";
    const sortOrder = request.nextUrl.searchParams.get("sortOrder") || "desc";

    const where: Record<string, unknown> = {};

    console.log("[GET /api/medias] filters", {
      classeId,
      type,
      search,
      sortBy,
      sortOrder,
      role: session.user.role,
      userId: session.user.id,
    });

    const role = normalizeRole(session.user.role?.label);

    if (classeId) {
      where.classeId = classeId;
    } else if (role === "prof") {
      where.enseignantId = session.user.id;
    } else {
      const eleve = await prisma.eleve.findFirst({
        where: { handledById: session.user.id },
        select: { classeId: true },
      });

      if (!eleve?.classeId) {
        console.warn("[GET /api/medias] Missing classeId for eleve", session.user.id);
        return NextResponse.json({ medias: [] });
      }

      where.classeId = eleve.classeId;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";

    const medias = await prisma.media.findMany({
      where,
      orderBy: orderBy as Record<string, "asc" | "desc">,
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

    console.log("[GET /api/medias] result count", medias.length, medias.slice(0, 2));

    return NextResponse.json({ medias });
  } catch (error) {
    console.error("GET /api/medias error", error);
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

    const role = normalizeRole(session.user.role?.label);
    if (role !== "prof") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, type, url, thumbnailUrl, classeId, duration, publishedAt } = body as {
      title: string;
      description?: string;
      type: string;
      url: string;
      thumbnailUrl?: string;
      classeId: string;
      duration?: number;
      publishedAt?: string;
    };

    if (!title || !url || !classeId) {
      return NextResponse.json({ error: "title, url et classeId requis" }, { status: 400 });
    }

    const media = await prisma.media.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type: type || "video",
        url: url.trim(),
        thumbnailUrl: thumbnailUrl?.trim() || null,
        classeId,
        enseignantId: session.user.id,
        isLive: false,
        isActive: true,
        duration: duration || null,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      },
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

    return NextResponse.json({ media });
  } catch (error) {
    console.error("POST /api/medias error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
