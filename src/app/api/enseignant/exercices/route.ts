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

    let enseignant = await prisma.enseignant.findFirst({
      where: { handledById: session.user.id },
      select: { id: true, prenom: true, nom: true, matiereId: true },
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
        select: { id: true, prenom: true, nom: true, matiereId: true },
      });
    }

    if (!enseignant) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const difficulte = searchParams.get("difficulte");
    const classeId = searchParams.get("classeId");

    const where: any = { enseignantId: enseignant.id };
    if (difficulte) where.difficulte = Number(difficulte);
    if (classeId) where.classeId = classeId;

    const exercices = await prisma.exercice.findMany({
      where,
      orderBy: [{ dateExercice: "asc" }, { createdAt: "asc" }],
    });

    const classeIds = Array.from(
      new Set(exercices.map((ex) => ex.classeId).filter(Boolean)),
    ) as string[];

    const classes = classeIds.length
      ? await prisma.classe.findMany({
          where: { id: { in: classeIds } },
          select: { id: true, label: true },
        })
      : [];

    const classesMap = new Map(classes.map((c) => [c.id, c]));

    return NextResponse.json({
      exercices: exercices.map((ex) => {
        const classe = classesMap.get(ex.classeId || "");
        return {
          id: ex.id,
          titre: ex.titre,
          consigne: ex.consigne,
          difficulte: ex.difficulte,
          classe: classe?.label ?? null,
          classeId: ex.classeId,
          dateExercice: ex.dateExercice ?? null,
          debloque: ex.debloque,
          createdAt: ex.createdAt,
        };
      }),
      enseignant,
    });
  } catch (error) {
    console.error("GET /api/enseignant/exercices error", error);
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

    let enseignant = await prisma.enseignant.findFirst({
      where: { handledById: session.user.id },
      select: { id: true, matiereId: true },
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
        select: { id: true, matiereId: true },
      });
    }

    if (!enseignant) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { titre, consigne, difficulte, classeId, dateExercice } = body as {
      titre: string;
      consigne: string;
      difficulte?: number;
      classeId?: string;
      dateExercice?: string;
    };

    if (!titre || !consigne) {
      return NextResponse.json({ error: "Titre et consigne requis" }, { status: 400 });
    }

    const exercice = await prisma.exercice.create({
      data: {
        titre,
        consigne,
        difficulte: difficulte ?? 1,
        classeId: classeId || null,
        dateExercice: dateExercice ? new Date(dateExercice) : null,
        enseignantId: enseignant.id,
        matiereId: enseignant.matiereId || "",
      },
    });

    return NextResponse.json({ exercice });
  } catch (error) {
    console.error("POST /api/enseignant/exercices error", error);
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const body = await request.json();
    const { titre, consigne, difficulte, classeId, dateExercice } = body as {
      titre: string;
      consigne: string;
      difficulte?: number;
      classeId?: string;
      dateExercice?: string;
    };

    if (!titre || !consigne) {
      return NextResponse.json({ error: "Titre et consigne requis" }, { status: 400 });
    }

    const exercice = await prisma.exercice.findFirst({
      where: { id },
      select: { id: true, enseignantId: true },
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
      data: {
        titre,
        consigne,
        difficulte: difficulte ?? 1,
        classeId: classeId || null,
        dateExercice: dateExercice ? new Date(dateExercice) : null,
      },
    });

    return NextResponse.json({ exercice: updated });
  } catch (error) {
    console.error("PUT /api/enseignant/exercices error", error);
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const exercice = await prisma.exercice.findFirst({
      where: { id },
      select: { id: true, enseignantId: true },
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

    await prisma.exercice.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/enseignant/exercices error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
