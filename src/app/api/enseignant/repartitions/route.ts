import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

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

  const search = request.nextUrl.searchParams.get("search");
  const classeId = request.nextUrl.searchParams.get("classeId");
  const matiereId = request.nextUrl.searchParams.get("matiereId");
  const statut = request.nextUrl.searchParams.get("statut");
  const date = request.nextUrl.searchParams.get("date");
  const month = request.nextUrl.searchParams.get("month");
  const dateFrom = request.nextUrl.searchParams.get("dateFrom");
  const dateTo = request.nextUrl.searchParams.get("dateTo");

  const where: any = { enseignantId: enseignant.id };

  if (classeId) where.classeId = classeId;
  if (matiereId) where.matiereId = matiereId;
  if (statut) where.statut = statut;
  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.date = { gte: d, lt: next };
  }
  if (month) {
    const d = new Date(month + "-01");
    const next = new Date(d);
    next.setMonth(next.getMonth() + 1);
    where.date = { gte: d, lt: next };
  }
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      where.date.gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  if (search) {
    where.OR = [
      { matiere: { label: { contains: search } } },
      { classe: { label: { contains: search } } },
      { lieuEcole: { label: { contains: search } } },
    ];
  }

  const repartitions = await prisma.repartition.findMany({
    where,
    select: {
      id: true,
      numItem: true,
      date: true,
      position: true,
      taux: true,
      statut: true,
      classeId: true,
      trimestreId: true,
      titreId: true,
      objectifId: true,
      notionId: true,
      exerciceId: true,
      pratiqueId: true,
      other: true,
      hourId: true,
      lieuId: true,
      matiere: { select: { label: true, abrev: true } },
      classe: { select: { label: true } },
      lieuEcole: { select: { label: true } },
    },
    orderBy: [{ date: "asc" }, { position: "asc" }],
  });

  return NextResponse.json(repartitions);
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

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.statut !== undefined) data.statut = body.statut;
  if (body.trimestreId !== undefined) data.trimestreId = body.trimestreId || null;
  if (body.titreId !== undefined) data.titreId = body.titreId || null;
  if (body.objectifId !== undefined) data.objectifId = body.objectifId || null;
  if (body.notionId !== undefined) data.notionId = body.notionId || null;
  if (body.exerciceId !== undefined) data.exerciceId = body.exerciceId || null;
  if (body.pratiqueId !== undefined) data.pratiqueId = body.pratiqueId || null;
  if (body.other !== undefined) data.other = body.other || null;

  const repartition = await prisma.repartition.updateMany({
    where: { id, enseignantId: enseignant.id },
    data,
  });

  if (repartition.count === 0) {
    return NextResponse.json({ error: "Répartition non trouvée" }, { status: 404 });
  }

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
  const entry = body.entry || body;
  const annee = body.annee || entry.annee || null;

  if (!entry || !entry.position || !entry.date) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  const date = new Date(entry.date);

  const classeId = entry.classeId || null;
  const lieuId = entry.lieuId || null;
  const rawHoraireId = entry.horaireId || null;
  const matiereId = entry.matiereId || enseignant.matiereId || null;

  const [classe, lieu, matiere] = await Promise.all([
    classeId
      ? prisma.classe.findFirst({ where: { id: classeId }, select: { id: true } })
      : Promise.resolve(null),
    lieuId
      ? prisma.lieuEcole.findFirst({ where: { id: lieuId }, select: { id: true } })
      : Promise.resolve(null),
    matiereId
      ? prisma.matiere.findFirst({ where: { id: matiereId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  const data: Record<string, unknown> = {
    position: Number(entry.position),
    date,
    classeId: classe ? classeId : null,
    lieuId: lieu ? lieuId : null,
    taux: entry.taux || null,
    statut: entry.statut || "NON_FAIT",
    matiereId: matiere ? matiereId : null,
    enseignantId: enseignant.id,
    annee: annee || null,
    trimestreId: entry.trimestreId || null,
    titreId: entry.titreId ? String(entry.titreId) : null,
    objectifId: entry.objectifId ? String(entry.objectifId) : null,
    notionId: entry.notionId ? String(entry.notionId) : null,
    exerciceId: entry.exerciceId ? String(entry.exerciceId) : null,
    pratiqueId: entry.pratiqueId ? String(entry.pratiqueId) : null,
    other: entry.other || null,
  };

  if (rawHoraireId && rawHoraireId !== "0") data.hourId = rawHoraireId;

  let repartition: { id?: string } = {};
  if (entry.id) {
    const result = await prisma.repartition.updateMany({
      where: { id: entry.id, enseignantId: enseignant.id },
      data,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Répartition non trouvée" }, { status: 404 });
    }
    repartition = { id: entry.id };
  } else {
    const created = await prisma.repartition.create({
      data,
    });
    repartition = created;
  }

  return NextResponse.json({ success: true, id: repartition.id });
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

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const repartition = await prisma.repartition.deleteMany({
    where: { id, enseignantId: enseignant.id },
  });

  if (repartition.count === 0) {
    return NextResponse.json({ error: "Répartition non trouvée" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
