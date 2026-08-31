"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getClasseColor } from "@/lib/badge-colors";
import { toast } from "sonner";

interface BilanData {
  repartitions: { total: number; faites: number };
  exercices: {
    total: number;
    parDifficulte: { difficulte: number; count: number }[];
  };
  notes: { moyenne: number; count: number };
  trimestres: { total: number; examen1: number; examen2: number };
  eleves: {
    total: number;
    classes: { id: string; label: string; elevesCount: number }[];
  };
  quiz: {
    totalQuiz: number;
    parDifficulte: { difficulte: number; count: number }[];
    tauxReussite: number | null;
  };
}

interface CardBilanProps {
  enseignantId?: string;
}

export function CardBilan({ enseignantId }: CardBilanProps) {
  const [data, setData] = useState<BilanData | null>(null);

  useEffect(() => {
    fetch("/api/enseignant/dashboard/bilan")
      .then((r) => {
        if (!r.ok) throw new Error("Non autorisé");
        return r.json();
      })
      .then(setData)
      .catch(() => toast.error("Erreur de chargement du bilan"));
  }, []);

  const repartitionsPercent = data?.repartitions.total
    ? Math.round((data.repartitions.faites / data.repartitions.total) * 100)
    : 0;
  const notesMoyenne = data?.notes.moyenne
    ? data.notes.moyenne.toFixed(1)
    : "-";

  return (
    <div className="w-full max-w-[580px] bg-[#111827] rounded-2xl overflow-hidden shadow-lg">
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
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 text-center">
        <h2 className="text-white text-[13px] font-bold uppercase tracking-wide">
          BILAN
        </h2>
        <p className="text-gray-400 text-sm mt-1">De l'énseignant</p>
      </div>

      <div className="px-6 pb-6 space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Répartitions</span>
            <span className="text-white">
              {data?.repartitions.faites ?? 0}/{data?.repartitions.total ?? 0}
            </span>
          </div>
          <div className="h-2 bg-[#1f2937] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1488fc] rounded-full"
              style={{ width: `${repartitionsPercent}%` }}
            />
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Élèves</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#1f2937] text-white border border-[#374151]">
              Total: {data?.eleves.total ?? 0}
            </Badge>
            {data?.eleves.classes.map((classe) => (
              <Badge
                key={classe.id}
                className={`${getClasseColor(classe.label)} px-2 py-1 rounded text-xs font-medium`}
              >
                {classe.label} ({classe.elevesCount})
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Leçons</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#1f2937] text-white border border-[#374151]">
              Total: {data?.trimestres.total ?? 0}
            </Badge>
            <Badge className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40">
              Examen 1: {data?.trimestres.examen1 ?? 0}
            </Badge>
            <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
              Examen 2: {data?.trimestres.examen2 ?? 0}
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-gray-400 text-sm mb-2">Exercices</p>
          <div className="flex flex-wrap gap-2">
            {data?.exercices.parDifficulte.map((d) => (
              <Badge
                key={d.difficulte}
                className="bg-[#1f2937] text-white border border-[#374151]"
              >
                N{d.difficulte}: {d.count}
              </Badge>
            ))}
            <Badge className="bg-[#1488fc]/20 text-[#1488fc] border border-[#1488fc]/40">
              Total: {data?.exercices.total ?? 0}
            </Badge>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Moyenne notes</span>
          <span className="text-white font-medium">{notesMoyenne}</span>
        </div>

        <div>
          <p className="text-gray-400 text-sm mb-2">Quiz</p>
          <div className="flex flex-wrap gap-2">
            {data?.quiz.parDifficulte.map((d) => (
              <Badge
                key={d.difficulte}
                className="bg-[#1f2937] text-white border border-[#374151]"
              >
                N{d.difficulte}: {d.count}
              </Badge>
            ))}
            <Badge className="bg-[#1488fc]/20 text-[#1488fc] border border-[#1488fc]/40">
              Total: {data?.quiz.totalQuiz ?? 0}
            </Badge>
            <Badge className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40">
              Réussite:{" "}
              {data?.quiz.tauxReussite !== null &&
              data?.quiz.tauxReussite !== undefined
                ? `${data.quiz.tauxReussite}%`
                : "-"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
