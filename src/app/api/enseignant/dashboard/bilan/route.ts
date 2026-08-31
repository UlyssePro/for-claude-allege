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

    const [repartitions, exercices, notes, trimestres, eleves, quiz] = await Promise.all([
      prisma.repartition.findMany({
        where: { enseignantId: enseignant.id },
        select: { statut: true },
      }),
      prisma.exercice.findMany({
        where: { enseignantId: enseignant.id },
        select: { difficulte: true },
      }),
      prisma.note.findMany({
        where: { profId: enseignant.id },
        select: { note1: true, note2: true, note3: true, note4: true, note5: true },
      }),
      prisma.trimestre.findMany({
        where: { enseignantId: enseignant.id },
        select: { numero: true, lecon: true, examen1: true, examen2: true },
      }),
      prisma.classe.findMany({
        where: {
          grillesEmploiTemps: {
            some: {
              enseignantId: enseignant.id,
              classeId: { not: null },
            },
          },
        },
        select: {
          id: true,
          label: true,
          _count: { select: { eleves: true } },
        },
        orderBy: { label: "asc" },
      }),
      Promise.all([
        prisma.quiz.count({
          where: { enseignantId: enseignant.id },
        }),
        prisma.quiz.groupBy({
          by: ["difficulte"],
          where: { enseignantId: enseignant.id },
          _count: { _all: true },
        }),
        prisma.quizAttempt.aggregate({
          where: { quiz: { enseignantId: enseignant.id } },
          _avg: { score: true },
        }),
      ]).then(([totalQuiz, quizByDifficulty, attempts]) => ({
        totalQuiz,
        parDifficulte: [1, 2, 3].map((d) => ({
          difficulte: d,
          count: quizByDifficulty.find((q) => q.difficulte === d)?._count._all || 0,
        })),
        tauxReussite: attempts._avg.score
          ? Math.round((attempts._avg.score / 10) * 100)
          : null,
      })),
    ]);

    const repartitionsTotal = repartitions.length;
    const repartitionsFaites = repartitions.filter((r) => r.statut === "FAIT").length;

    const exercicesTotal = exercices.length;
    const exercicesParDifficulte = [1, 2, 3].map((d) => ({
      difficulte: d,
      count: exercices.filter((e) => e.difficulte === d).length,
    }));

    const notesValues = notes.flatMap((n) => [n.note1, n.note2, n.note3, n.note4, n.note5].filter((v): v is string => !!v));
    const notesNumeric = notesValues.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
    const notesMoyenne = notesNumeric.length ? notesNumeric.reduce((a, b) => a + b, 0) / notesNumeric.length : 0;

    const trimestresTotal = trimestres.length;
    const trimestresAvecExamen1 = trimestres.filter((t) => t.examen1 && t.examen1 !== "-").length;
    const trimestresAvecExamen2 = trimestres.filter((t) => t.examen2 && t.examen2 !== "-").length;

    const elevesTotal = eleves.reduce((sum, c) => sum + (c._count.eleves || 0), 0);

    return NextResponse.json({
      repartitions: { total: repartitionsTotal, faites: repartitionsFaites },
      exercices: { total: exercicesTotal, parDifficulte: exercicesParDifficulte },
      notes: { moyenne: notesMoyenne, count: notesNumeric.length },
      trimestres: { total: trimestresTotal, examen1: trimestresAvecExamen1, examen2: trimestresAvecExamen2 },
      eleves: { total: elevesTotal, classes: eleves.map((c) => ({ id: c.id, label: c.label, elevesCount: c._count.eleves || 0 })) },
      quiz,
    });
  } catch (error) {
    console.error("GET /api/enseignant/dashboard/bilan error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
