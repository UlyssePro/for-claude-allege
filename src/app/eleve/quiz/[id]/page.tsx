"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { useQuizActivation } from "@/hooks/use-quiz-activation";

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
  score: number;
  total: number;
  answers: unknown;
  createdAt: string;
  quiz?: Quiz;
}

interface Answer {
  questionId: string;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export default function QuizGamePage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [finished, setFinished] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [usualClasseId, setUsualClasseId] = useState("");
  const { enabled: quizEnabled } = useQuizActivation(usualClasseId);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eleve/quiz");
      if (res.ok) {
        const data = await res.json();
        const found = (data.quizs || []).find((q: Quiz) => q.id === quizId);
        if (found) {
          setQuiz(found);
        } else {
          toast.error("Quiz non trouvé");
          router.push("/eleve/quiz");
        }
      } else {
        toast.error("Erreur lors du chargement du quiz");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const loadAttempts = async () => {
    try {
      const res = await fetch("/api/eleve/quiz/attempts");
      if (res.ok) {
        const data = await res.json();
        setAttempts(data.attempts || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (quizId && !loading && quiz) {
      loadAttempts();
    }
  }, [quizId, loading, quiz]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch("/api/eleve/me");
        if (res.ok) {
          const data = await res.json();
          setUsualClasseId(data.classe?.usualClasseId || "");
        }
      } catch {
        // ignore
      }
    };
    loadMe();
  }, []);

  const handleSubmit = () => {
    if (!quiz) return;

    const isCorrect = userAnswer.trim().toLowerCase() === quiz.reponse.trim().toLowerCase();
    setAnswer({
      questionId: quiz.id,
      question: quiz.question,
      correctAnswer: quiz.reponse,
      userAnswer: userAnswer.trim(),
      isCorrect,
    });
    setUserAnswer("");
  };

  const handleFinish = async () => {
    if (!quiz || !answer) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/eleve/quiz/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          score: answer.isCorrect ? 1 : 0,
          total: 1,
          answers: [answer],
        }),
      });

      if (res.ok) {
        setFinished(true);
        toast.success("Quiz terminé !");
        loadAttempts();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  const getAttemptScore = (attempt: Attempt) => {
    const attemptAnswers = Array.isArray(attempt.answers) ? attempt.answers : [];
    return attemptAnswers.filter((a: unknown) => {
      const ans = a as { isCorrect?: boolean };
      return ans?.isCorrect === true;
    }).length;
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-[rgb(156_163_175)]">
        Chargement...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-12 text-[rgb(156_163_175)]">
        Quiz non trouvé
      </div>
    );
  }

  if (!quizEnabled) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push("/eleve/quiz")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux quizs
        </Button>
        <Card>
          <CardContent className="p-6 text-center text-sm text-[rgb(156_163_175)]">
            Le quiz n'est pas encore activé pour votre classe. Veuillez contacter votre professeur.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => router.push("/eleve/quiz")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux quizs
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[rgb(243_244_246)]">
              Historique des tentatives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-sm text-[rgb(156_163_175)]">
                Aucune tentative pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {attempts.map((attempt, idx) => {
                  const attemptAnswers = Array.isArray(attempt.answers)
                    ? attempt.answers
                    : [];
                  const userAnswer =
                    attemptAnswers[0]?.userAnswer || "(vide)";
                  const isCorrect =
                    (attemptAnswers[0] as { isCorrect?: boolean } | undefined)
                      ?.isCorrect === true;

                  return (
                    <div
                      key={attempt.id}
                      className="p-2 rounded border border-[rgb(55_65_81)] bg-[rgb(31_41_55)]/40"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[rgb(156_163_175)]">
                          Tentative {idx + 1} - {new Date(attempt.createdAt).toLocaleString("fr-FR")}
                        </span>
                        <span className="text-xs font-medium text-[rgb(243_244_246)]">
                          {getAttemptScore(attempt)}/{attempt.total}
                        </span>
                      </div>
                      <div className="text-[11px] space-y-1">
                        <p className="text-[rgb(243_244_246)] font-medium">
                          Q: {attempt.quiz?.question || "-"}
                        </p>
                        <p className="text-[rgb(156_163_175)]">
                          Réponse: {userAnswer}
                        </p>
                        {!isCorrect && attempt.quiz?.reponse && (
                          <p className="text-[rgb(74_222_124)]">
                            Bonne réponse: {attempt.quiz.reponse}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[rgb(243_244_246)]">
                {finished ? "Résultat" : "Question"}
              </CardTitle>
              <span className="text-xs px-2 py-1 rounded bg-[rgb(55_65_81)] text-[rgb(156_163_175)]">
                {quiz.difficulte === 1
                  ? "Facile"
                  : quiz.difficulte === 2
                    ? "Moyen"
                    : "Difficile"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-base text-[rgb(243_244_246)] mb-4">
                {quiz.question}
              </p>

              {finished && answer ? (
                <div
                  className={`p-4 rounded border ${
                    answer.isCorrect
                      ? "border-[rgb(74_222_124)]/30 bg-[rgb(74_222_124)]/10"
                      : "border-[rgb(239_68_68)]/30 bg-[rgb(239_68_68)]/10"
                  }`}
                >
                  <p className="text-sm font-medium text-[rgb(243_244_246)] mb-1">
                    {answer.isCorrect ? "Bonne réponse ! 🎉" : "Mauvaise réponse 😔"}
                  </p>
                  <p className="text-xs text-[rgb(156_163_175)]">
                    Votre réponse : {answer.userAnswer || "(vide)"}
                  </p>
                  {!answer.isCorrect && (
                    <p className="text-xs text-[rgb(74_222_124)]">
                      Bonne réponse : {quiz.reponse}
                    </p>
                  )}
                </div>
              ) : answer ? (
                <div
                  className={`p-4 rounded border ${
                    answer.isCorrect
                      ? "border-[rgb(74_222_124)]/30 bg-[rgb(74_222_124)]/10"
                      : "border-[rgb(239_68_68)]/30 bg-[rgb(239_68_68)]/10"
                  }`}
                >
                  <p className="text-sm font-medium text-[rgb(243_244_246)] mb-1">
                    {answer.isCorrect ? "Bonne réponse ! 🎉" : "Mauvaise réponse 😔"}
                  </p>
                  <p className="text-xs text-[rgb(156_163_175)]">
                    Votre réponse : {answer.userAnswer || "(vide)"}
                  </p>
                  {!answer.isCorrect && (
                    <p className="text-xs text-[rgb(74_222_124)]">
                      Bonne réponse : {quiz.reponse}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Votre réponse..."
                    className="bg-[#1e1e21] border-[rgb(55_65_81)] text-[rgb(243_244_246)]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSubmit();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!userAnswer.trim()}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Valider
                  </Button>
                </div>
              )}
            </div>

            {answer && !finished && (
              <div className="flex justify-end">
                <Button onClick={handleFinish} disabled={submitting}>
                  Terminer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
