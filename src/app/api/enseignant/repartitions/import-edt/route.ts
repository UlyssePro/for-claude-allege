import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

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
      return NextResponse.json(
        { error: "Enseignant non trouvé" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { startDate, endDate } = body as {
      startDate?: string;
      endDate?: string;
    };

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate et endDate sont requis" },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const edtEntries = await prisma.grilleEmploiTemps.findMany({
      where: {
        enseignantId: enseignant.id,
        matiereId: enseignant.matiereId,
        classeId: { not: null },
      },
      select: {
        id: true,
        date: true,
        jour: true,
        position: true,
        classeId: true,
        horaireId: true,
        matiereId: true,
        annee: true,
      },
    });

    const existing = await prisma.repartition.findMany({
      where: {
        enseignantId: enseignant.id,
        date: { gte: start, lte: end },
      },
      select: { id: true, date: true, position: true },
    });

    const existingByKey = new Map(
      existing.map((e) => {
        const d = e.date ? new Date(e.date).toISOString().split("T")[0] : "";
        return [`${d}-${e.position}`, e.id];
      }),
    );

    const toCreate: any[] = [];
    const toUpdate: { id: string; entry: any; date: Date }[] = [];

    const targetDates: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      targetDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const entry of edtEntries) {
      const entryDate = entry.date ? new Date(entry.date) : null;
      const entryDay = entryDate
        ? (entryDate.getDay() + 6) % 7
        : entry.jour ?? null;
      if (entryDay === null) continue;

      const targetDate = targetDates.find((d) => (d.getDay() + 6) % 7 === entryDay);
      if (!targetDate) continue;

      const key = `${targetDate.toISOString().split("T")[0]}-${entry.position}`;
      const existingId = existingByKey.get(key);

      if (existingId) {
        toUpdate.push({ id: existingId, entry, date: targetDate });
      } else {
        toCreate.push({ ...entry, date: targetDate });
      }
    }

    console.log("Import EDT toCreate", toCreate.length, "toUpdate", toUpdate.length);

    const updated = await Promise.all(
      toUpdate.map(({ id, entry, date }) =>
        prisma.repartition.update({
          where: { id },
          data: {
            matiereId: entry.matiereId ?? enseignant.matiereId ?? null,
            classeId: entry.classeId,
            hourId: entry.horaireId,
            date,
            position: entry.position,
            annee: entry.annee ?? undefined,
            statut: "NON_FAIT",
            taux: null,
          },
          select: {
            id: true,
            date: true,
            position: true,
            statut: true,
            classeId: true,
            hourId: true,
          },
        }),
      ),
    );

    const created = await Promise.all(
      toCreate.map((entry) =>
        prisma.repartition.create({
          data: {
            enseignantId: enseignant.id,
            matiereId: entry.matiereId ?? enseignant.matiereId ?? null,
            classeId: entry.classeId,
            hourId: entry.horaireId,
            date: entry.date,
            position: entry.position,
            annee: entry.annee ?? undefined,
            statut: "NON_FAIT",
            taux: null,
          },
          select: {
            id: true,
            date: true,
            position: true,
            statut: true,
            classeId: true,
            hourId: true,
          },
        }),
      ),
    );

    return NextResponse.json({
      imported: created.length,
      updated: updated.length,
      skipped: edtEntries.length - toCreate.length - toUpdate.length,
      entries: [...created, ...updated],
    });
  } catch (error) {
    console.error("POST /api/enseignant/repartitions/import-edt error", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
