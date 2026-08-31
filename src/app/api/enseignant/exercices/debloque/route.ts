import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

const WS_URL = process.env.WS_URL || "http://localhost:3001";

async function broadcast(event: string, room: string, payload: any) {
  try {
    const res = await fetch(`${WS_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, room, payload }),
    });
    console.log("[broadcast]", event, room, payload, res.status);
  } catch (error) {
    console.error(`Failed to broadcast ${event}:`, error);
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const body = await request.json();
    const { debloque } = body as { debloque: boolean };

    const exercice = await prisma.exercice.findFirst({
      where: { id },
      select: { id: true, enseignantId: true, classeId: true },
    });

    if (!exercice) {
      return NextResponse.json({ error: "Exercice non trouvé" }, { status: 404 });
    }

    let enseignant = await prisma.enseignant.findFirst({
      where: { handledById: session.user.id },
      select: { id: true },
    });

    if (!enseignant && session.user.username) {
      const fullName = session.user.username.trim();
      const parts = fullName.split(" ");
      const prenom = parts[0] || "";
      const nom = parts[1] || "";

      enseignant = await prisma.enseignant.findFirst({
        where: {
          OR: [
            { prenom, nom },
            { prenom: { contains: fullName } },
            { nom: { contains: fullName } },
          ],
        },
        select: { id: true },
      });
    }

    if (!enseignant || exercice.enseignantId !== enseignant.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const updated = await prisma.exercice.update({
      where: { id },
      data: { debloque },
    });

    if (exercice.classeId) {
      broadcast("exercice-debloque", exercice.classeId, { exerciceId: updated.id, debloque });
    }

    return NextResponse.json({ exercice: updated });
  } catch (error) {
    console.error("PUT /api/enseignant/exercices/debloque error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
