import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminSessionId = request.cookies.get("admin_session_id")?.value;

  const [
    eleves,
    enseignants,
    classes,
    matieres,
    repartitions,
    quizs,
    notes,
    loggedUsers,
    latestRepartitions,
    repartitionsByStatut,
    latestEleves,
    latestEnseignants,
  ] = await Promise.all([
    prisma.eleve.count({
      where: adminSessionId ? { sessionId: adminSessionId } : undefined,
    }),
    prisma.enseignant.count({
      where: adminSessionId ? { sessionId: adminSessionId } : undefined,
    }),
    prisma.classe.count({
      where: adminSessionId ? {
        eleves: {
          some: { sessionId: adminSessionId },
        },
      } : undefined,
    }),
    prisma.matiere.count(),
    prisma.repartition.count({
      where: adminSessionId ? {
        enseignant: { sessionId: adminSessionId },
      } : undefined,
    }),
    prisma.quiz.count(),
    prisma.note.count({
      where: adminSessionId ? {
        eleve: { sessionId: adminSessionId },
      } : undefined,
    }),
    prisma.user.count({
      where: {
        ...(adminSessionId ? { sessionId: adminSessionId } : {}),
        logged: true,
      },
    }),
    prisma.repartition.findMany({
      where: adminSessionId ? {
        enseignant: { sessionId: adminSessionId },
      } : undefined,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        classe: true,
        enseignant: true,
        matiere: true,
        lieuEcole: true,
      },
    }),
    prisma.repartition.groupBy({
      where: adminSessionId ? {
        enseignant: { sessionId: adminSessionId },
      } : undefined,
      by: ["statut"],
      _count: { statut: true },
    }),
    prisma.eleve.findMany({
      where: adminSessionId ? { sessionId: adminSessionId } : undefined,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { classe: true },
    }),
    prisma.enseignant.findMany({
      where: adminSessionId ? { sessionId: adminSessionId } : undefined,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { matiere: true },
    }),
  ]);

  return NextResponse.json({
    stats: {
      eleves,
      enseignants,
      classes,
      matieres,
      repartitions,
      quizs,
      notes,
      loggedUsers,
    },
    latestRepartitions,
    repartitionsByStatut,
    latestEleves,
    latestEnseignants,
  });
}