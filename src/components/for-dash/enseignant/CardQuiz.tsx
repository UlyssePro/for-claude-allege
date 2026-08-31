"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface QuizData {
  totalQuiz: number;
  parDifficulte: { difficulte: number; count: number }[];
  tauxReussite: number | null;
}

interface CardQuizProps {
  data?: QuizData | null;
}

export function CardQuiz({ data }: CardQuizProps) {
  const [stats, setStats] = useState<QuizData | null>(null);

  useEffect(() => {
    if (data) {
      setStats(data);
      return;
    }
    fetch("/api/enseignant/dashboard/quiz-stats")
      .then((r) => {
        if (!r.ok) throw new Error("Non autorisé");
        return r.json();
      })
      .then(setStats)
      .catch(() => toast.error("Erreur de chargement du quiz"));
  }, [data]);

  const tauxLabel = stats?.tauxReussite !== null && stats?.tauxReussite !== undefined
    ? `${stats.tauxReussite}%`
    : "-";

  return (
    <div className="w-full max-w-[540px] bg-[#111827] rounded-2xl overflow-hidden shadow-lg">
      <div className="relative bg-[#1e3a8a] px-6 pt-6 pb-16"></div>

      <div className="flex justify-center -mt-16 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-16 h-16 text-[#1e3a8a]"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 3L1 9l11 6 9-4.91V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.27L12 3z" />
            <path d="M12 12l8.5-4.5M12 12v9M12 12L3.5 7.5" />
          </svg>
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 text-center">
        <h2 className="text-white text-xl font-bold uppercase tracking-wide">
          QUIZ
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Total: {stats?.totalQuiz ?? 0}
        </p>
      </div>

      <div className="px-6 pb-6 space-y-4">
        <div>
          <p className="text-gray-400 text-sm mb-2">Difficulté</p>
          <div className="flex flex-wrap gap-2">
            {stats?.parDifficulte.map((d) => (
              <Badge key={d.difficulte} className="bg-[#1f2937] text-white border border-[#374151]">
                N{d.difficulte}: {d.count}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Taux de réussite</span>
          <span className="text-white font-medium">{tauxLabel}</span>
        </div>
      </div>
    </div>
  );
}
