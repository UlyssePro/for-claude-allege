"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RowActions } from "@/components/ui/row-actions";
import { Plus, FileText } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { getClasseColor } from "@/lib/badge-colors";
import { AddButton } from "@/components/ui/add-button";

interface QuizActivation {
  id: string;
  usualClasseId: string;
  enabled: boolean;
  updatedAt: string;
}

interface Quiz {
  id: string;
  question: string;
  reponse: string;
  difficulte: number;
  done: boolean;
  classe: string;
  createdAt: string;
}

interface UsualClasse {
  id: string;
  libelle: string;
}

interface QuizForm {
  id?: string;
  question: string;
  reponse: string;
  difficulte: string;
  classe: string;
}

export default function QuizPage() {
  const [quizs, setQuizs] = useState<Quiz[]>([]);
  const [usualClasses, setUsualClasses] = useState<UsualClasse[]>([]);
  const [activations, setActivations] = useState<QuizActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [difficulteFilter, setDifficulteFilter] = useState("");
  const [classeFilter, setClasseFilter] = useState("");
  const [form, setForm] = useState<QuizForm>({
    question: "",
    reponse: "",
    difficulte: "1",
    classe: "",
  });
  const [adding, setAdding] = useState(false);

  const loadQuizs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/enseignant/quiz");
      if (res.ok) {
        const data = await res.json();
        setQuizs(data.quizs || []);
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error || "Erreur lors du chargement des quizs");
      }
    } catch {
      toast.error("Erreur réseau lors du chargement des quizs");
    } finally {
      setLoading(false);
    }
  };

  const loadUsualClasses = async () => {
    try {
      const res = await fetch("/api/enseignant/grilles/refs");
      if (res.ok) {
        const data = await res.json();
        setUsualClasses(data.usualClasses || []);
      }
    } catch {
      // ignore
    }
  };

  const loadActivations = async () => {
    try {
      const res = await fetch("/api/enseignant/quiz/activation");
      if (res.ok) {
        const data = await res.json();
        setActivations(data.activations || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadQuizs();
    loadUsualClasses();
    loadActivations();
  }, []);

  const filteredQuizs = useMemo(() => {
    return quizs.filter((quiz) => {
      const matchesSearch =
        !search ||
        quiz.question.toLowerCase().includes(search.toLowerCase()) ||
        quiz.reponse.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulte =
        !difficulteFilter || String(quiz.difficulte) === difficulteFilter;
      const matchesClasse = !classeFilter || quiz.classe === classeFilter;
      return matchesSearch && matchesDifficulte && matchesClasse;
    });
  }, [quizs, search, difficulteFilter, classeFilter]);

  const resetForm = () => {
    setForm({
      id: undefined,
      question: "",
      reponse: "",
      difficulte: "1",
      classe: "",
    });
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (quiz: Quiz) => {
    setForm({
      id: quiz.id,
      question: quiz.question,
      reponse: quiz.reponse,
      difficulte: String(quiz.difficulte),
      classe: quiz.classe,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.reponse.trim()) {
      toast.error("Question et réponse requises");
      return;
    }

    setAdding(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit
        ? `/api/enseignant/quiz?id=${form.id}`
        : "/api/enseignant/quiz";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: form.question,
          reponse: form.reponse,
          difficulte: Number(form.difficulte),
          classe: form.classe,
        }),
      });

      if (res.ok) {
        toast.success(isEdit ? "Quiz modifié" : "Quiz ajouté");
        setModalOpen(false);
        resetForm();
        loadQuizs();
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/enseignant/quiz?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Quiz supprimé");
        loadQuizs();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

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

  const activationMap = useMemo(() => {
    const map = new Map<string, boolean>();
    activations.forEach((a) => map.set(a.usualClasseId, a.enabled));
    return map;
  }, [activations]);

  const toggleActivation = async (usualClasseId: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/enseignant/quiz/activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usualClasseId, enabled }),
      });

      if (res.ok) {
        toast.success(!enabled ? "Quiz activé" : "Quiz désactivé");
        loadActivations();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  return (
    <div className="relative space-y-4">
      <div className="mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-50">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            onClear={() => setSearch("")}
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={difficulteFilter} onValueChange={setDifficulteFilter}>
            <SelectTrigger className="h-9 w-40 bg-[#1e1e21] border-[rgb(55_65_81)] text-xs text-[rgb(203_210_224)]">
              <SelectValue placeholder="Toutes difficultés" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes difficultés</SelectItem>
              <SelectItem value="1">Facile</SelectItem>
              <SelectItem value="2">Moyen</SelectItem>
              <SelectItem value="3">Difficile</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classeFilter} onValueChange={setClasseFilter}>
            <SelectTrigger className="h-9 w-40 bg-[#1e1e21] border-[rgb(55_65_81)] text-xs text-[rgb(203_210_224)]">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les classes</SelectItem>
              {usualClasses.map((uc) => (
                <SelectItem key={uc.id} value={uc.libelle}>
                  {uc.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddButton onClick={openAddModal} />
        </div>
      </div>

      <div className="absolute w-full px-2 z-100">
        <div className="w-full flex items-center justify-between z-100 rounded-full bg-[#111827] px-4 py-1 -mt-[1.5vh] border border-[#374151] ">
          {usualClasses.map((uc) => {
            const enabled = activationMap.get(uc.id) ?? false;
            return (
              <div
                key={uc.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <label htmlFor={uc.id} className="text-sm text-[#bb3ee0]">
                  {uc.libelle}
                </label>
                <input
                  type="checkbox"
                  name="activateQuiz"
                  id={uc.id}
                  checked={enabled}
                  onChange={(e) => toggleActivation(uc.id, e.target.checked)}
                  className="cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <div className="max-h-[69.4vh] rounded-md border border-[rgb(55_65_81)] bg-[#1e1e21] overflow-hidden">
          <div className="overflow-y-auto scrollbar-none scrollbar-thumb-[rgb(13_18_107)]/30 scrollbar-track-transparent scrollbar-thumb-rounded-full max-h-[68vh]">
            <table
              className="w-full border-collapse text-sm"
              style={{ tableLayout: "fixed" }}
            >
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 80 }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-[#1b2234]">
                <tr className="h-[2rem]">
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    #
                  </th>
                  <th className="p-1.5 text-left text-[11px] font-medium text-[rgb(203_210_224)]">
                    Question
                  </th>
                  <th className="p-1.5 text-left text-[11px] font-medium text-[rgb(203_210_224)]">
                    Réponse
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Difficulté
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Classe
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(55_65_81)]">
                {filteredQuizs.map((quiz, i) => (
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
                    <td className="p-1.5 align-middle text-[11px] text-[rgb(243_244_246)]">
                      <span className="line-clamp-2">{quiz.reponse}</span>
                    </td>
                    <td className="p-1.5 text-center align-middle">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${getDifficulteColor(quiz.difficulte)}`}
                      >
                        {getDifficulteLabel(quiz.difficulte)}
                      </span>
                    </td>
                    <td className="p-1.5 text-center align-middle">
                      {quiz.classe ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${getClasseColor(quiz.classe)}`}
                        >
                          {quiz.classe}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[rgb(156_163_175)]">
                          -
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 text-center align-middle">
                      <RowActions
                        actions={[
                          {
                            label: "Modifier",
                            onClick: () => openEditModal(quiz),
                          },
                          {
                            label: "Supprimer",
                            onClick: () => handleDelete(quiz.id),
                            destructive: true,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => !open && setModalOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Modifier le Quiz" : "Nouveau Quiz"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[rgb(156_163_175)]">
                Question
              </Label>
              <Input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Votre question..."
                className="bg-[#1e1e21] border-[rgb(55_65_81)] text-[rgb(243_244_246)]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[rgb(156_163_175)]">Réponse</Label>
              <Input
                value={form.reponse}
                onChange={(e) => setForm({ ...form, reponse: e.target.value })}
                placeholder="La réponse..."
                className="bg-[#1e1e21] border-[rgb(55_65_81)] text-[rgb(243_244_246)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[rgb(156_163_175)]">
                  Difficulté
                </Label>
                <Select
                  value={form.difficulte}
                  onValueChange={(v) => setForm({ ...form, difficulte: v })}
                >
                  <SelectTrigger className="bg-[#1e1e21] border-[rgb(55_65_81)] text-[rgb(243_244_246)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Facile</SelectItem>
                    <SelectItem value="2">Moyen</SelectItem>
                    <SelectItem value="3">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[rgb(156_163_175)]">
                  Classe
                </Label>
                <Select
                  value={form.classe}
                  onValueChange={(v) => setForm({ ...form, classe: v })}
                >
                  <SelectTrigger className="bg-[#1e1e21] border-[rgb(55_65_81)] text-[rgb(243_244_246)]">
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune classe</SelectItem>
                    {usualClasses.map((uc) => (
                      <SelectItem key={uc.id} value={uc.libelle}>
                        {uc.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={adding}>
                {adding
                  ? "Enregistrement..."
                  : form.id
                    ? "Modifier"
                    : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
