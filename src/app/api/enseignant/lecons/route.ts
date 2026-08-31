import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
      },
      select: { id: true },
    });
  }

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  const search = request.nextUrl.searchParams.get("search")?.trim() || "";
  const usualClasseId = request.nextUrl.searchParams.get("usualClasseId") || "";
  const trimestre = request.nextUrl.searchParams.get("trimestre") || "";

  const where: any = { enseignantId: enseignant.id };

  if (usualClasseId) {
    const classes = await prisma.classe.findMany({
      where: { usualClasseId },
      select: { id: true },
    });
    where.classeId = { in: classes.map((c) => c.id) };
  }

  if (trimestre) {
    where.numero = parseInt(trimestre.replace("T", ""), 10);
  }

  const trimestres = await prisma.trimestre.findMany({
    where,
    select: {
      id: true,
      numero: true,
      lecon: true,
      matiereId: true,
      classeId: true,
      examen1: true,
      examen2: true,
      matiere: { select: { id: true, label: true, abrev: true } },
      cahiers: {
        select: {
          id: true,
          titre: true,
          objectif: true,
          notion: true,
          exercice: true,
          pratique: true,
        },
      },
    },
    orderBy: [{ classeId: "asc" }, { lecon: "asc" }],
  });

  const allUsualClasses = await prisma.usualClasse.findMany({
    select: { id: true, libelle: true },
    orderBy: { id: "asc" },
  });

  const trimestresByClasse = new Map<string, any[]>();
  for (const t of trimestres) {
    const key = t.classeId || "no-classe";
    if (!trimestresByClasse.has(key)) {
      trimestresByClasse.set(key, []);
    }
    trimestresByClasse.get(key)!.push({
      ...t,
      classe: null,
    });
  }

  let result = allUsualClasses.map((uc) => {
    const trimestresForClasse = trimestresByClasse.get(uc.id) || [];
    return {
      id: uc.id,
      label: uc.libelle,
      usualClasseId: uc.id,
      trimestres: trimestresForClasse,
    };
  });

  if (search) {
    const s = search.toLowerCase();
    result = result.filter((c) => {
      const matchClasse = c.label.toLowerCase().includes(s);
      const matchTrimestres = c.trimestres.some(
        (t: any) =>
          t.lecon?.toLowerCase().includes(s) ||
          t.matiere?.label?.toLowerCase().includes(s),
      );
      return matchClasse || matchTrimestres;
    });
  }

  return NextResponse.json(result);
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

    if (!enseignant) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { classeId, matiereId, numero, lecon, examen1, examen2, cahiers } = body;

    if (!classeId || !matiereId || numero === undefined || numero === null) {
      return NextResponse.json({ error: "classeId, matiereId et numero sont requis" }, { status: 400 });
    }

    const trimestre = await prisma.trimestre.create({
      data: {
        classeId,
        numero: Number(numero),
        lecon: lecon || "",
        examen1: examen1 || "",
        examen2: examen2 || "",
        matiere: { connect: { id: matiereId } },
        enseignant: { connect: { id: enseignant.id } },
      },
      select: {
        id: true,
        numero: true,
        lecon: true,
        examen1: true,
        examen2: true,
        matiereId: true,
        classeId: true,
      },
    });

    if (cahiers && Array.isArray(cahiers)) {
      for (const cahier of cahiers) {
        await prisma.cahier.create({
          data: {
            trimestreId: trimestre.id,
            titre: cahier.titre || "[]",
            objectif: cahier.objectif || "[]",
            notion: cahier.notion || "[]",
            exercice: cahier.exercice || "[]",
            pratique: cahier.pratique || "[]",
          },
        });
      }
    }

    return NextResponse.json(trimestre, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, lecon, examen1, examen2, cahiers } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await prisma.trimestre.update({
      where: { id },
      data: {
        lecon,
        examen1,
        examen2,
      },
    });

    if (cahiers && Array.isArray(cahiers)) {
      for (const cahier of cahiers) {
        await prisma.cahier.update({
          where: { id: cahier.id },
          data: {
            titre: cahier.titre,
            objectif: cahier.objectif,
            notion: cahier.notion,
            exercice: cahier.exercice,
            pratique: cahier.pratique,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await prisma.cahier.deleteMany({
      where: { trimestreId: id },
    });

    await prisma.trimestre.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
