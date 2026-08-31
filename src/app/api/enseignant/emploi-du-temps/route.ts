import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

function getSchoolYearLabel(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 8) {
    return `${String(year).slice(2)}-${String(year + 1).slice(2)}`;
  }
  return `${String(year - 1).slice(2)}-${String(year).slice(2)}`;
}

function jourFromDate(date: Date | null | undefined): number | null {
  if (!date) return null;
  return (date.getDay() + 6) % 7;
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
      select: { id: true, matiereId: true, sessionId: true },
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
        select: { id: true, matiereId: true, sessionId: true },
      });
    }

    if (!enseignant) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const ownFiltered = { enseignantId: enseignant.id };
    const otherFiltered = session.user.sessionId || enseignant.sessionId
      ? { enseignant: { sessionId: session.user.sessionId || enseignant.sessionId } }
      : {};

    let ownEntries: any[] = [];
    let otherEntries: any[] = [];

    console.log("DEBUG EDT:", {
      userSessionId: session.user.sessionId || enseignant.sessionId,
      enseignantId: enseignant.id,
      ownFiltered,
      otherFiltered,
    });

    try {
      const [resOwn, resOther] = await Promise.all([
        prisma.grilleEmploiTemps.findMany({
          where: {
            ...ownFiltered,
            enseignantId: enseignant.id,
          },
          select: {
            id: true,
            position: true,
            annee: true,
            date: true,
            jour: true,
            classeId: true,
            lieuId: true,
            horaireId: true,
            enseignantId: true,
            matiereId: true,
          },
          orderBy: { position: "asc" },
        }),
        prisma.grilleEmploiTemps.findMany({
          where: {
            ...otherFiltered,
            enseignantId: { not: enseignant.id },
          },
          select: {
            id: true,
            position: true,
            annee: true,
            date: true,
            jour: true,
            classeId: true,
            lieuId: true,
            horaireId: true,
            enseignantId: true,
            matiereId: true,
          },
          orderBy: { position: "asc" },
        }),
      ]);
      ownEntries = resOwn;
      otherEntries = resOther;
      console.log("DEBUG EDT RESULTS:", {
        ownCount: ownEntries.length,
        otherCount: otherEntries.length,
        ownEntries: ownEntries.map((e) => ({ id: e.id, position: e.position, jour: e.jour, classeId: e.classeId })),
        otherEntries: otherEntries.map((e) => ({ id: e.id, position: e.position, jour: e.jour, classeId: e.classeId })),
      });
    } catch (error) {
      console.error("DEBUG EDT ERROR:", error);
    }

    if (ownEntries.length === 0 && otherEntries.length === 0) {
      const sameNameIds = session.user.username
        ? (await prisma.enseignant.findMany({
            where: {
              OR: [
                {
                  prenom: session.user.username.split(" ")[0] || "",
                  nom: session.user.username.split(" ")[1] || "",
                },
                {
                  prenom: { contains: session.user.username },
                },
                {
                  nom: { contains: session.user.username },
                },
              ],
            },
            select: { id: true },
          })).map((e) => e.id)
        : [];

      if (sameNameIds.length > 0) {
        const [crossOwn, crossOther] = await Promise.all([
          prisma.grilleEmploiTemps.findMany({
            where: {
              enseignantId: { in: sameNameIds },
            },
            select: {
              id: true,
              position: true,
              annee: true,
              date: true,
              jour: true,
              classeId: true,
              lieuId: true,
              horaireId: true,
              enseignantId: true,
              matiereId: true,
            },
            orderBy: { position: "asc" },
          }),
          prisma.grilleEmploiTemps.findMany({
            where: {
              AND: [
                { enseignantId: { not: enseignant.id } },
                { enseignantId: { in: sameNameIds } },
              ],
              ...(enseignant.sessionId
                ? { enseignant: { sessionId: enseignant.sessionId } }
                : {}),
            },
            select: {
              id: true,
              position: true,
              annee: true,
              date: true,
              jour: true,
              classeId: true,
              lieuId: true,
              horaireId: true,
              enseignantId: true,
              matiereId: true,
            },
            orderBy: { position: "asc" },
          }),
        ]);

        ownEntries.push(
          ...crossOwn.filter((e) => e.enseignantId === enseignant.id),
        );
        otherEntries.push(
          ...crossOther.filter((e) => e.enseignantId !== enseignant.id),
        );
      }
    }

    console.log("DEBUG EDT AFTER FALLBACK:", {
      ownEntriesLength: ownEntries.length,
      otherEntriesLength: otherEntries.length,
    });

    const merged = new Map<string, any>();

    for (const entry of otherEntries) {
      const key = `${entry.jour ?? 0}-${entry.position}`;
      merged.set(key, {
        ...entry,
        jour: entry.jour ?? jourFromDate(entry.date),
        isOwner: false,
      });
    }

    for (const entry of ownEntries) {
      const key = `${entry.jour ?? 0}-${entry.position}`;
      merged.set(key, {
        ...entry,
        jour: entry.jour ?? jourFromDate(entry.date),
        isOwner: true,
      });
    }

    const result = Array.from(merged.values()).sort((a, b) => {
      const keyA = `${a.jour}-${a.position}`;
      const keyB = `${b.jour}-${b.position}`;
      return keyA.localeCompare(keyB);
    });

    return NextResponse.json(
      result.map((e) => ({
        id: e.id,
        position: e.position,
        annee: e.annee,
        date: e.date ? e.date.toISOString().split("T")[0] : null,
        jour: e.jour,
        classeId: e.classeId,
        lieuId: e.lieuId,
        horaireId: e.horaireId,
        enseignantId: e.enseignantId,
        matiereId: e.matiereId,
        isOwner: !!e.isOwner,
      })),
    );
  } catch (error) {
    console.error("GET /api/enseignant/emploi-du-temps error", error);
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
    const entries: { position: number; jour: number; classeId?: string | null; lieuId?: string | null; horaireId?: string | null }[] = Array.isArray(body)
      ? body
      : [];

    const annee = getSchoolYearLabel(new Date());

    const existing = await prisma.grilleEmploiTemps.findMany({
      where: { enseignantId: enseignant.id, annee },
      select: { id: true, position: true, jour: true },
    });

    const normalizedExisting = existing
      .map((e) => ({
        ...e,
        jour: e.jour ?? (e.date ? jourFromDate(e.date) : null),
      }))
      .filter((e) => e.jour !== null);

    const incomingKeys = new Set(entries.map((e) => `${e.position}-${e.jour}`));
    const toDelete = normalizedExisting.filter((e) => {
      const key = `${e.position}-${e.jour}`;
      return !incomingKeys.has(key);
    });

    if (toDelete.length) {
      await prisma.grilleEmploiTemps.deleteMany({
        where: { id: { in: toDelete.map((e) => e.id) } },
      });
    }

    const saved = await Promise.all(
      entries.map(async (entry) => {
        const existingMatch = normalizedExisting.find(
          (e) => e.position === entry.position && e.jour === entry.jour,
        );

        const horaireId = entry.horaireId;

        if (existingMatch) {
          return await prisma.grilleEmploiTemps.update({
            where: { id: existingMatch.id },
            data: {
              jour: entry.jour,
              classeId: entry.classeId || null,
              lieuId: entry.lieuId || null,
              horaireId: horaireId || null,
              matiereId: enseignant.matiereId || null,
            },
            select: {
              id: true,
              position: true,
              annee: true,
              date: true,
              jour: true,
              classeId: true,
              lieuId: true,
              horaireId: true,
            },
          });
        }

                return await prisma.grilleEmploiTemps.create({
                  data: {
                    enseignantId: enseignant.id,
                    position: entry.position,
                    jour: entry.jour,
                    annee,
                    horaireId: horaireId || null,
                    matiereId: enseignant.matiereId || null,
                    classeId: entry.classeId || null,
                    lieuId: entry.lieuId || null,
                  },
          select: {
            id: true,
            position: true,
            annee: true,
            date: true,
            jour: true,
            classeId: true,
            lieuId: true,
            horaireId: true,
          },
        });
      }),
    );

    return NextResponse.json(
      saved.map((e) => ({
        id: e.id,
        position: e.position,
        annee: e.annee,
        date: e.date ? new Date(e.date).toISOString().split("T")[0] : null,
        jour: e.jour,
        classeId: e.classeId,
        lieuId: e.lieuId,
        horaireId: e.horaireId,
      })),
    );
  } catch (error) {
    console.error("POST /api/enseignant/emploi-du-temps error", error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: "Erreur serveur", details: message, stack },
      { status: 500 },
    );
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

    const existing = await prisma.grilleEmploiTemps.findFirst({
      where: { id, enseignantId: enseignant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Entrée non trouvée" }, { status: 404 });
    }

    await prisma.grilleEmploiTemps.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/enseignant/emploi-du-temps error", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: String(error) },
      { status: 500 },
    );
  }
}
