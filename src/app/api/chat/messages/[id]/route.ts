import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

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

    const { id: messageId } = await params;
    const body = await request.json();
    const { content } = body as { content: string };

    if (!content?.trim()) {
      return NextResponse.json({ error: "Contenu requis" }, { status: 400 });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, userId: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    if (message.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { content: content.trim() },
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
        ...updated,
        userImage: user?.image || null,
      },
    });
  } catch (error) {
    console.error("PUT /api/chat/messages/[id] error", error);
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

    const { id: messageId } = await params;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, userId: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    if (message.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/chat/messages/[id] error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
