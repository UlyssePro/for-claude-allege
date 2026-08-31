import { prisma } from "../src/lib/prisma";
import quizData from "../quiz-informatique.json" assert { type: "json" };

async function main() {
  console.log("📥 Insertion des quizs...");
  const quizs = Array.isArray(quizData) ? quizData : [];
  
  for (const q of quizs) {
    await prisma.quiz.create({
      data: {
        question: q.question,
        reponse: q.reponse,
        difficulte: q.difficulte || null,
        done: q.done || false,
        enseignantId: q.enseignantId,
        matiereId: q.matiereId,
        usualClasseId: q.usualClasseId,
        classe: q.classe,
      },
    });
  }
  
  console.log(`✅ ${quizs.length} quizs insérés avec succès !`);
}

main().catch((e) => {
  console.error("❌ Erreur :", e);
  process.exit(1);
});
