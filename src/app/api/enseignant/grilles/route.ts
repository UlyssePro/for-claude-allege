import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

const HORAIRE_ID_BY_POSITION: Record<number, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "0",
  5: "4",
  6: "5",
  7: "6",
  8: "7",
  9: "8",
};

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const session = await getCurrentUser(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const enseignant = await prisma.enseignant.findFirst({
    where: { handledById: session.user.id },
    select: { id: true, matiereId: true },
  });

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  const annee = request.nextUrl.searchParams.get("annee");
  const date = request.nextUrl.searchParams.get("date");
  const month = request.nextUrl.searchParams.get("month");

  const where: any = { enseignantId: enseignant.id };
  if (annee) where.annee = annee;
  if (month) {
    const d = new Date(month + "-01");
    const next = new Date(d);
    next.setMonth(next.getMonth() + 1);
    where.date = {
      gte: d,
      lt: next,
    };
  } else if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.date = {
      gte: d,
      lt: next,
    };
  }

  const grilles = await prisma.grilleEmploiTemps.findMany({
    where,
    select: {
      id: true,
      position: true,
      annee: true,
      task: true,
      matiereId: true,
      classeId: true,
      lieuId: true,
      horaireId: true,
      date: true,
      matiere: { select: { id: true, label: true } },
      classe: { select: { id: true, label: true } },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(grilles);
}

export async function PATCH(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const session = await getCurrentUser(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const enseignant = await prisma.enseignant.findFirst({
    where: { handledById: session.user.id },
    select: { id: true },
  });

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  const body = await request.json();
  const { id, done } = body as { id: string; done: boolean };

  if (!id) {
    return NextResponse.json({ error: "Identifiant requis" }, { status: 400 });
  }

  const existing = await prisma.grilleEmploiTemps.findFirst({
    where: { id, enseignantId: enseignant.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Créneau non trouvé" }, { status: 404 });
  }

  const updated = await prisma.grilleEmploiTemps.update({
    where: { id },
    data: { task: "" },
    select: {
      id: true,
      position: true,
      annee: true,
      date: true,
      task: true,
      matiereId: true,
      classeId: true,
      lieuId: true,
      horaireId: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const session = await getCurrentUser(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const enseignant = await prisma.enseignant.findFirst({
    where: { handledById: session.user.id },
    select: { id: true },
  });

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Identifiant requis" }, { status: 400 });
  }

  const existing = await prisma.grilleEmploiTemps.findFirst({
    where: { id, enseignantId: enseignant.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Créneau non trouvé" }, { status: 404 });
  }

  await prisma.grilleEmploiTemps.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const session = await getCurrentUser(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const enseignant = await prisma.enseignant.findFirst({
    where: { handledById: session.user.id },
    select: { id: true, matiereId: true },
  });

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  const body = await request.json();
  const { entries, annee, date } = body as {
    entries: {
      position: number;
      task?: string;
      classeId?: string;
      lieuId?: string;
      taux?: string | null;
    }[];
    annee?: string;
    date?: string;
  };

  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "Entrées invalides" }, { status: 400 });
  }

  const dateObj = date ? new Date(date) : null;

  const lieuIds = entries.map((e) => e.lieuId).filter((id): id is string => !!id);
  const lieux = await prisma.lieuEcole.findMany({
    where: { id: { in: lieuIds } },
    select: { id: true, taux: true },
  });
  const lieuMap = new Map(lieux.map((l) => [l.id, l.taux]));



  const saved = await Promise.all(
    entries.map((entry) => {
      const horaireId = HORAIRE_ID_BY_POSITION[entry.position] ?? null;
      const taux = entry.taux ?? (entry.lieuId ? lieuMap.get(entry.lieuId) : null);

      return prisma.grilleEmploiTemps.findFirst({
        where: {
          enseignantId: enseignant.id,
          position: entry.position,
          annee: annee ?? null,
          date: dateObj,
        },
        select: { id: true },
      }).then((existing) => {
        if (existing) {
          return prisma.grilleEmploiTemps.update({
            where: { id: existing.id },
            data: {
              task: entry.task ?? null,
              matiereId: enseignant.matiereId ?? null,
              classeId: entry.classeId ?? null,
              lieuId: entry.lieuId ?? null,
              horaireId,
              date: dateObj,
            },
            select: {
              id: true,
              position: true,
              annee: true,
              date: true,
              task: true,
              matiereId: true,
              classeId: true,
              lieuId: true,
              horaireId: true,
            },
          });
        }
        return prisma.grilleEmploiTemps.create({
          data: {
            enseignantId: enseignant.id,
            position: entry.position,
            annee: annee ?? null,
            date: dateObj,
            task: entry.task ?? null,
            matiereId: enseignant.matiereId ?? null,
            classeId: entry.classeId ?? null,
            lieuId: entry.lieuId ?? null,
            horaireId,
          },
          select: {
            id: true,
            position: true,
            annee: true,
            date: true,
            task: true,
            matiereId: true,
            classeId: true,
            lieuId: true,
            horaireId: true,
          },
        });
      });
    }),
  );

  return NextResponse.json(saved);
}
