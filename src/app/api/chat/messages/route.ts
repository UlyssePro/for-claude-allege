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
    if (!classeId) {
      return NextResponse.json({ error: "classeId requis" }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { classeId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userName: true,
        userRole: true,
        content: true,
        createdAt: true,
        userId: true,
      },
    });

    const uniqueUserIds = Array.from(new Set(messages.map((m) => m.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, image: true },
    });
    const userImageMap = new Map(users.map((u) => [u.id, u.image || null]));

    const enriched = messages.map((m) => ({
      ...m,
      userImage: userImageMap.get(m.userId) || null,
    }));

    return NextResponse.json({ messages: enriched });
  } catch (error) {
    console.error("GET /api/chat/messages error", error);
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
    const { classeId, content } = body as { classeId: string; content: string };

    if (!classeId || !content?.trim()) {
      return NextResponse.json({ error: "classeId et message requis" }, { status: 400 });
    }

    const userRole = normalizeRole(session.user.role?.label);
    const message = await prisma.chatMessage.create({
      data: {
        classeId,
        userId: session.user.id,
        userName: session.user.username,
        userRole,
        content: content.trim(),
      },
      select: {
        id: true,
        userName: true,
        userRole: true,
        content: true,
        createdAt: true,
        userId: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    return NextResponse.json({
      message: {
        ...message,
        userImage: user?.image || null,
      },
    });
  } catch (error) {
    console.error("POST /api/chat/messages error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
