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

    let enseignant = await prisma.enseignant.findFirst({
      where: {
        handledById: session.user.id,
        ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
      },
      select: { id: true, prenom: true, nom: true, matiereId: true, profSess: true },
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
          ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
        },
        select: { id: true, prenom: true, nom: true, matiereId: true, profSess: true },
      });
    }

    if (!enseignant) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const edtEntries = await prisma.grilleEmploiTemps.findMany({
      where: { enseignantId: enseignant.id, classeId: { not: null } },
      select: { classeId: true },
      distinct: ["classeId"],
    });

    const allowedClasseIds = Array.from(
      new Set(edtEntries.map((e) => e.classeId).filter((id): id is string => id !== null)),
    );

    const where: any = {
      profId: enseignant.id,
      ...(enseignant.matiereId ? { matiereId: enseignant.matiereId } : {}),
    };

    if (allowedClasseIds.length > 0) {
      where.eleve = {
        ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
        classeId: { in: allowedClasseIds },
      };
    } else {
      if (session.user.sessionId) {
        where.eleve = { sessionId: session.user.sessionId };
      }
    }

    const notes = await prisma.note.findMany({
      where,
      select: {
        id: true,
        eleveId: true,
        note1: true,
        note2: true,
        note3: true,
        note4: true,
        note5: true,
        eleve: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            numero: true,
            photo: true,
            classe: { select: { id: true, label: true } },
            genre: { select: { id: true, label: true, gen: true } },
          },
        },
      },
      orderBy: [{ eleve: { lastname: "asc" } }, { eleve: { firstname: "asc" } }],
    });

    const result = notes.map((n) => ({
      id: n.id,
      eleveId: n.eleveId,
      eleveNom: `${n.eleve.firstname ?? ""} ${n.eleve.lastname ?? ""}`.trim(),
      photo: n.eleve.photo,
      numero: n.eleve.numero,
      classe: n.eleve.classe,
      genre: n.eleve.genre,
      note1: n.note1 != null ? String(n.note1) : null,
      note2: n.note2 != null ? String(n.note2) : null,
      note3: n.note3 != null ? String(n.note3) : null,
      note4: n.note4 != null ? String(n.note4) : null,
      note5: n.note5 != null ? String(n.note5) : null,
    }));

    return NextResponse.json({
      notes: result,
      enseignant: {
        id: enseignant.id,
        prenom: enseignant.prenom,
        nom: enseignant.nom,
        matiereId: enseignant.matiereId,
        profSess: enseignant.profSess,
      },
    });
  } catch (error) {
    console.error("GET /api/enseignant/notes error", error);
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
      where: {
        handledById: session.user.id,
        ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
      },
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
          ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
        },
        select: { id: true, matiereId: true },
      });
    }

    if (!enseignant) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { eleveId, matiereId, note1, note2, note3, note4, note5 } = body as {
      eleveId: string;
      matiereId?: string;
      note1?: string | null;
      note2?: string | null;
      note3?: string | null;
      note4?: string | null;
      note5?: string | null;
    };

    if (!eleveId) {
      return NextResponse.json({ error: "eleveId requis" }, { status: 400 });
    }

    let finalMatiereId = matiereId || enseignant.matiereId;

    if (!finalMatiereId) {
      const fallback = await prisma.note.findFirst({
        where: { profId: enseignant.id },
        select: { matiereId: true },
      });
      finalMatiereId = fallback?.matiereId ?? null;
    }

    if (!finalMatiereId) {
      return NextResponse.json(
        { error: "Aucune matière associée à cet enseignant", details: { enseignantId: enseignant.id, matiereId: enseignant.matiereId } },
        { status: 400 },
      );
    }

    const toNoteValue = (v: string | null | undefined) =>
      v && v.trim() !== "" ? v.trim() : null;

    const existing = await prisma.note.findFirst({
      where: {
        eleveId,
        profId: enseignant.id,
        matiereId: finalMatiereId,
      },
    });

    const updateData: Record<string, string | null> = {};
    if (note1 !== undefined) updateData.note1 = toNoteValue(note1);
    if (note2 !== undefined) updateData.note2 = toNoteValue(note2);
    if (note3 !== undefined) updateData.note3 = toNoteValue(note3);
    if (note4 !== undefined) updateData.note4 = toNoteValue(note4);
    if (note5 !== undefined) updateData.note5 = toNoteValue(note5);

    if (existing) {
      await prisma.note.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await prisma.note.create({
        data: {
          eleveId,
          profId: enseignant.id,
          matiereId: finalMatiereId,
          ...updateData,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/enseignant/notes error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
