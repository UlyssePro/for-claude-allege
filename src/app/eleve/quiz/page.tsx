"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuizActivation } from "@/hooks/use-quiz-activation";
import { getClasseColor } from "@/lib/badge-colors";

interface Quiz {
  id: string;
  question: string;
  reponse: string;
  difficulte: number;
  done: boolean;
  classe: string;
  createdAt: string;
}

interface Attempt {
  id: string;
  quizId: string;
}

export default function EleveQuizPage() {
  const [quizs, setQuizs] = useState<Quiz[]>([]);
  const [classeLabel, setClasseLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [usualClasseId, setUsualClasseId] = useState("");
  const router = useRouter();
  const { enabled: quizEnabled } = useQuizActivation(usualClasseId);

  const loadQuizs = async () => {
    setLoading(true);
    try {
      const [quizRes, meRes] = await Promise.all([
        fetch("/api/eleve/quiz"),
        fetch("/api/eleve/me"),
      ]);
      if (quizRes.ok) {
        const data = await quizRes.json();
        setQuizs(data.quizs || []);
        setClasseLabel(data.classeLabel || "");
      } else {
        const err = await quizRes
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error || "Erreur lors du chargement des quizs");
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setUsualClasseId(data.classe?.usualClasseId || "");
      }
    } catch {
      toast.error("Erreur réseau lors du chargement des quizs");
    } finally {
      setLoading(false);
    }
  };

  const loadAttempts = async () => {
    try {
      const res = await fetch("/api/eleve/quiz/attempts");
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>(
          (data.attempts || []).map((a: Attempt) => a.quizId),
        );
        setAttemptedIds(ids);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadQuizs();
    loadAttempts();
  }, []);

  const getDifficulteLabel = (d: number) => {
    switch (d) {
      case 1:
        return "Facile";
      case 2:
        return "Moyen";
      case 3:
        return "Difficile";
      default:
        return String(d);
    }
  };

  const getDifficulteColor = (d: number) => {
    switch (d) {
      case 1:
        return "bg-[rgb(74_222_124)]/20 text-[rgb(74_222_124)]";
      case 2:
        return "bg-[rgb(255_191_0)]/20 text-[rgb(255_191_0)]";
      case 3:
        return "bg-[rgb(239_68_68)]/20 text-[rgb(239_68_68)]";
      default:
        return "bg-[rgb(107_114_128)]/20 text-[rgb(156_163_175)]";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-[rgb(156_163_175)]">
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!quizEnabled && (
        <Card>
          <CardContent className="p-4 text-center text-sm text-[rgb(156_163_175)]">
            Le quiz n'est pas encore activé pour votre classe. Veuillez
            contacter votre professeur.
          </CardContent>
        </Card>
      )}

      {quizEnabled && (
        <Card>
          <div className="max-h-[78vh] rounded-md border border-[rgb(55_65_81)] bg-[#1e1e21] overflow-hidden">
            <div className="overflow-y-auto scrollbar-none scrollbar-thumb-[rgb(13_18_107)]/30 scrollbar-track-transparent scrollbar-thumb-rounded-full max-h-[76vh]">
              <table
                className="w-full border-collapse text-sm"
                style={{ tableLayout: "fixed" }}
              >
                <colgroup>
                  <col style={{ width: 20 }} />
                  <col style={{ width: "80%" }} />
                  <col style={{ width: 20 }} />
                  <col style={{ width: 20 }} />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-[#1b2234]">
                  <tr className="h-[2rem]">
                    <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                      #
                    </th>
                    <th className="p-1.5 text-left text-[11px] font-medium text-[rgb(203_210_224)]">
                      Question
                    </th>
                    <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                      Difficulté
                    </th>
                    <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(55_65_81)]">
                  {quizs.map((quiz, i) => (
                    <tr
                      key={quiz.id}
                      className="h-[3rem] hover:bg-[rgb(31_41_55)]/40 transition-colors"
                    >
                      <td className="p-1.5 text-center align-middle text-[11px] text-[rgb(156_163_175)]">
                        {i + 1}
                      </td>
                      <td className="p-1.5 align-middle text-[11px] text-[rgb(243_244_246)]">
                        <span className="line-clamp-2">{quiz.question}</span>
                      </td>
                      <td className="p-1.5 text-center align-middle">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${getDifficulteColor(quiz.difficulte)}`}
                        >
                          {getDifficulteLabel(quiz.difficulte)}
                        </span>
                      </td>
                      <td className="p-1.5 text-center align-middle">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8  ${attemptedIds.has(quiz.id) || !quizEnabled ? "opacity-50 cursor-not-allowed text-[#85888b]" : "cursor-pointer text-[rgb(74_222_124)]"}`}
                          onClick={() => router.push(`/eleve/quiz/${quiz.id}`)}
                          title="Jouer"
                          disabled={attemptedIds.has(quiz.id) || !quizEnabled}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
