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

    const search = request.nextUrl.searchParams.get("search");
    const categorieId = request.nextUrl.searchParams.get("categorieId");
    const lieuId = request.nextUrl.searchParams.get("lieuId");

    let enseignant = await prisma.enseignant.findFirst({
      where: {
        handledById: session.user.id,
        ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
      },
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
          ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
        },
        select: { id: true },
      });
    }

    if (!enseignant) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const edtEntries = await prisma.grilleEmploiTemps.findMany({
      where: { enseignantId: enseignant.id, classeId: { not: null } },
      select: { classeId: true },
    });

    const allowedClasseIds = Array.from(
      new Set(edtEntries.map((e) => e.classeId).filter((id): id is string => id !== null)),
    );

    const classes = await prisma.classe.findMany({
      where: {
        id: { in: allowedClasseIds },
        ...(search ? { label: { contains: search } } : {}),
        ...(categorieId ? { categorieId: categorieId } : {}),
        ...(lieuId ? { lieuId: lieuId } : {}),
      },
      select: {
        id: true,
        label: true,
        ClasseCategorie: { select: { label: true } },
        lieuEcole: { select: { id: true, label: true } },
        _count: { select: { eleves: true } },
      },
      orderBy: { label: "asc" },
    });

    return NextResponse.json(
      classes.map((c) => ({
        id: c.id,
        label: c.label,
        categorie: c.ClasseCategorie ? { label: c.ClasseCategorie.label } : null,
        lieu: c.lieuEcole ? { id: c.lieuEcole.id, label: c.lieuEcole.label } : null,
        _count: { eleves: c._count.eleves },
      })),
    );
  } catch (error) {
    console.error("GET /api/enseignant/classes error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const body = await request.json();
    const { label, categorieId, lieuId } = body as {
      label?: string;
      categorieId?: string;
      lieuId?: string;
    };

    const updated = await prisma.classe.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(categorieId !== undefined ? { categorieId: categorieId || null } : {}),
        ...(lieuId !== undefined ? { lieuId: lieuId || null } : {}),
      },
      select: {
        id: true,
        label: true,
        ClasseCategorie: { select: { label: true } },
        lieuEcole: { select: { id: true, label: true } },
        _count: { select: { eleves: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      label: updated.label,
      categorie: updated.ClasseCategorie ? { label: updated.ClasseCategorie.label } : null,
      lieu: updated.lieuEcole ? { id: updated.lieuEcole.id, label: updated.lieuEcole.label } : null,
      _count: { eleves: updated._count.eleves },
    });
  } catch (error) {
    console.error("PATCH /api/enseignant/classes error:", error);
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

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    await prisma.classe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/enseignant/classes error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
