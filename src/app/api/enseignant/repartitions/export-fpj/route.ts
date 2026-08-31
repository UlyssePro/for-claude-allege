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
      return NextResponse.json(
        { error: "Enseignant non trouvé" },
        { status: 404 },
      );
    }

    const month = request.nextUrl.searchParams.get("month");
    const annee = request.nextUrl.searchParams.get("annee");
    const matiereId = request.nextUrl.searchParams.get("matiereId");

    if (!month || !annee) {
      return NextResponse.json(
        { error: "month et annee sont requis" },
        { status: 400 },
      );
    }

    const monthNum = Number(month);
    const yearStart = Number(String(annee).split("-")[0]) + 2000;
    const dateFrom = new Date(yearStart, monthNum - 1, 1);
    const dateTo = new Date(yearStart, monthNum, 0, 23, 59, 59, 999);

    const [matiere] = await Promise.all([
      matiereId
        ? prisma.matiere.findFirst({
            where: { id: matiereId },
            select: { id: true, label: true },
          })
        : Promise.resolve(null),
    ]);

    const where: any = {
      enseignantId: enseignant.id,
      date: { gte: dateFrom, lte: dateTo },
    };
    if (matiereId) where.matiereId = matiereId;

    const [repartitions, horaires] = await Promise.all([
      prisma.repartition.findMany({
        where,
        select: {
          id: true,
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
          matiereId: true,
          matiere: { select: { label: true, abrev: true } },
          classe: { select: { label: true } },
          lieuEcole: { select: { label: true } },
          horaire: { select: { id: true, hour: true } },
        },
        orderBy: [{ date: "asc" }, { position: "asc" }],
      }),
      prisma.horaire.findMany({
        select: { id: true, hour: true },
        orderBy: { position: "asc" },
      }),
    ]);

    return NextResponse.json({
      repartitions,
      horaires,
      matiere,
      enseignant: {
        id: enseignant.id,
        prenom: enseignant.prenom,
        nom: enseignant.nom,
      },
      dateFrom: dateFrom.toISOString(),
    });
  } catch (error) {
    console.error("GET /api/enseignant/repartitions/export-fpj error", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: String(error) },
      { status: 500 },
    );
  }
}
