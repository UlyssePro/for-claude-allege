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

    const eleve = await prisma.eleve.findFirst({
      where: { handledById: session.user.id },
      select: { id: true, classeId: true },
    });

    if (!eleve) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const [repartitions, exercices, notes, trimestres, quiz] = await Promise.all([
      prisma.repartition.findMany({
        where: eleve.classeId ? { classeId: eleve.classeId } : {},
        select: { statut: true },
      }),
      prisma.exercice.findMany({
        where: eleve.classeId ? { classeId: eleve.classeId } : {},
        select: { difficulte: true },
      }),
      prisma.note.findMany({
        where: { eleveId: eleve.id },
        select: { note1: true, note2: true, note3: true, note4: true, note5: true },
      }),
      prisma.trimestre.findMany({
        where: eleve.classeId ? { classeId: eleve.classeId } : {},
        select: { numero: true, lecon: true, examen1: true, examen2: true },
      }),
      Promise.all([
        prisma.quiz.count({
          where: eleve.classeId ? { usualClasseId: eleve.classeId } : {},
        }),
        prisma.quiz.groupBy({
          by: ["difficulte"],
          where: eleve.classeId ? { usualClasseId: eleve.classeId } : {},
          _count: { _all: true },
        }),
        prisma.quizAttempt.aggregate({
          where: { eleveId: eleve.id },
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

    const noteColumns = ["note1", "note2", "note3", "note4", "note5"] as const;
    const notesParValeur = noteColumns.reduce<Record<string, { somme: number; count: number }>>((acc, col) => {
      acc[col] = { somme: 0, count: 0 };
      return acc;
    }, {} as Record<string, { somme: number; count: number }>);

    notes.forEach((n) => {
      noteColumns.forEach((col) => {
        const raw = (n as any)[col];
        if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
          const num = parseFloat(String(raw));
          if (!isNaN(num)) {
            notesParValeur[col].somme += num;
            notesParValeur[col].count += 1;
          }
        }
      });
    });

    const trimestresTotal = trimestres.length;
    const trimestresAvecExamen1 = trimestres.filter((t) => t.examen1 && t.examen1 !== "-").length;
    const trimestresAvecExamen2 = trimestres.filter((t) => t.examen2 && t.examen2 !== "-").length;

    return NextResponse.json({
      repartitions: { total: repartitionsTotal, faites: repartitionsFaites },
      exercices: { total: exercicesTotal, parDifficulte: exercicesParDifficulte },
      notes: {
        moyenne: notesMoyenne,
        count: notesNumeric.length,
        parNote: noteColumns.map((col) => ({
          label: col.replace("note", "Note "),
          moyenne: notesParValeur[col].count
            ? notesParValeur[col].somme / notesParValeur[col].count
            : null,
        })),
      },
      trimestres: { total: trimestresTotal, examen1: trimestresAvecExamen1, examen2: trimestresAvecExamen2 },
      quiz,
    });
  } catch (error) {
    console.error("GET /api/eleve/dashboard/bilan error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
