"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { CustomTable } from "@/components/ui/custom-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";
import { useExerciceRealtime } from "@/hooks/use-exercice-realtime";

interface ExerciceEntry {
  id: string;
  titre: string;
  consigne: string;
  difficulte: number;
  classe: string;
  dateExercice: string | null;
  createdAt: string;
  debloque: boolean;
  fait: boolean;
  note: string | null;
  reponse: string | null;
  task: string | null;
}

export default function EleveExercicesPage() {
  const [loading, setLoading] = useState(true);
  const [exercices, setExercices] = useState<ExerciceEntry[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExercice, setSelectedExercice] =
    useState<ExerciceEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [reponse, setReponse] = useState("");
  const [eleveId, setEleveId] = useState<string>("");
  const [classeId, setClasseId] = useState<string>("");
  const { modePdf: pdfModalOpen, pdfUrl, openPdf, closePdf } = usePdfPreview();
  const [eleveNom, setEleveNom] = useState("");
  const [eleveClasse, setEleveClasse] = useState("");

  const loadExercices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eleve/exercices");
      if (res.ok) {
        const data = await res.json();
        setExercices(data.exercices || []);
      } else {
        toast.error("Erreur lors du chargement des exercices");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExercices();
    fetch("/api/eleve/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.firstname && data?.lastname) {
          setEleveNom(`${data.firstname} ${data.lastname}`);
        }
        if (data?.classe?.label) {
          setEleveClasse(data.classe.label);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/eleve/me", { credentials: "include" });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setEleveId(data.id || "");
          setClasseId(data.classe?.id || "");
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useExerciceRealtime({
    usualClasseId: classeId || undefined,
    eleveId: eleveId || undefined,
    onExerciceCreated: loadExercices,
    onExerciceCorrige: loadExercices,
    onExerciceDebloque: loadExercices,
  });

  const filteredExercices = useMemo(() => {
    return exercices.filter((exercice) => {
      const matchesSearch =
        !search ||
        (exercice.titre || "").toLowerCase().includes(search.toLowerCase());
      const matchesDate =
        !dateFilter ||
        (exercice.dateExercice
          ? new Date(exercice.dateExercice).toISOString().slice(0, 10) ===
            dateFilter
          : false);
      return matchesSearch && matchesDate;
    });
  }, [exercices, search, dateFilter]);

  const openDoModal = (exercice: ExerciceEntry) => {
    setSelectedExercice(exercice);
    setReponse("");
    setModalOpen(true);
  };

  const handleMarkDone = async () => {
    if (!selectedExercice) return;
    setSaving(true);
    try {
      const res = await fetch("/api/eleve/exercices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciceId: selectedExercice.id,
          reponse,
        }),
      });

      if (res.ok) {
        toast.success("Exercice marqué comme fait");
        setModalOpen(false);
        setSelectedExercice(null);
        setReponse("");
        loadExercices();
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("l", "mm", "a4");

      await addSchoolPdfHeader(doc, {
        title: "LISTE DES PRATIQUES",
        countLabel: `${filteredExercices.length} PRATIQUES`,
        lineStart: 14,
        lineEndOffset: 14,
      });

      const tableColumn = ["#", "Titre", "Date", "Statut", "Note"];
      const tableRows: string[][] = [];

      filteredExercices.forEach((exercice, idx) => {
        tableRows.push([
          String(idx + 1),
          exercice.titre || "-",
          exercice.classe || "-",
          exercice.dateExercice
            ? new Date(exercice.dateExercice).toLocaleDateString("fr-FR")
            : "-",
          exercice.debloque ? "Débloqué" : "Bloqué",
          exercice.note || (exercice.fait ? "En attente" : "-"),
        ]);
      });

      doc.setFontSize(10);
      doc.text(`Élève : ${eleveNom || "-"}`, 14, 32);
      doc.text(`Classe : ${eleveClasse || "-"}`, 14, 36);

      autoTable(doc, {
        startY: 40,
        head: [tableColumn],
        body: tableRows,
        theme: "grid",
        headStyles: {
          fillColor: [130, 130, 130],
          textColor: [255, 255, 255],
          halign: "center",
          cellPadding: { top: 2, bottom: 2, left: 6, right: 6 },
        },
        styles: {
          fontSize: 10,
          cellPadding: { top: 4.5, bottom: 4.5, left: 2, right: 2 },
        },
        showHead: "firstPage",
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 115 },
          3: { cellWidth: 40, halign: "center" },
          4: { cellWidth: 45, halign: "center" },
          5: { cellWidth: 45, halign: "center" },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Exercices");

      openPdf(doc);
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-50">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            onClear={() => setSearch("")}
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 rounded-[var(--radius-sm)] border border-[#1e293b] h-9 w-40 text-center bg-[#1e1e21] border-[#1e293b] text-xs text-[rgb(203_210_224)]"
        />
        <div className="flex items-center gap-2">
          <ExportPdfButton
            onClick={handleExportPdf}
            disabled={filteredExercices.length === 0}
          >
            <FileText className="h-4 w-4 text-white" /> PDF
          </ExportPdfButton>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <CustomTable
            columns={[
              {
                header: "#",
                accessor: (e, idx) => (
                  <span className="text-[rgb(243_244_246)] text-center">
                    {idx + 1}
                  </span>
                ),
                width: "40px",
                className: "text-center",
              },
              {
                header: "Titre",
                accessor: (e) => (
                  <div className="flex items-center gap-2">
                    <span className="text-[rgb(243_244_246)] truncate">
                      {e.titre}
                    </span>
                    {/Pratique\s*:/i.test(e.task || "") && (
                      <span className="text-[10px] font-medium text-[rgb(239,68,68)]">
                        Pratique
                      </span>
                    )}
                  </div>
                ),
                width: "390px",
              },
              {
                header: "Date",
                accessor: (e) =>
                  e.dateExercice ? (
                    <span className="text-[11px] text-[rgb(203_210_224)]">
                      {new Date(e.dateExercice).toLocaleDateString("fr-FR")}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[rgb(156_163_175)]">
                      -
                    </span>
                  ),
                width: "60px",
              },
              {
                header: "Note",
                accessor: (e) =>
                  e.note ? (
                    <span className="font-medium text-[rgb(74_222_124)]">
                      {e.note}
                    </span>
                  ) : e.fait ? (
                    <span className="text-[rgb(156_163_175)]">
                      En attente de correction
                    </span>
                  ) : (
                    <span className="text-[rgb(156_163_175)]">-</span>
                  ),
                width: "20px",
                className: "text-center",
              },
              {
                header: "Actions",
                accessor: (e) =>
                  e.fait ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[rgb(74_222_124)]">
                      <CheckSquare className="h-4 w-4" />
                      Fait
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 text-xs"
                      onClick={() => openDoModal(e)}
                      disabled={!e.debloque}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Todo
                    </Button>
                  ),
                width: "60px",
              },
            ]}
            data={filteredExercices}
          />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marquer l'exercice comme fait</DialogTitle>
          </DialogHeader>
          {selectedExercice && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-[rgb(203_210_224)]">
                  <span className="font-medium">Titre :</span>{" "}
                  {selectedExercice.titre}
                </p>
                {selectedExercice.dateExercice && (
                  <p className="text-xs text-[rgb(156_163_175)] mt-1">
                    <span className="font-medium">Date :</span>{" "}
                    {new Date(selectedExercice.dateExercice).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-[rgb(156_163_175)]">
                  Ce que tu as fait <span className="text-red-400">*</span>
                </Label>
                <textarea
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Décris ce que tu as fait pour cet exercice..."
                  required
                  className="mt-1 w-full rounded-md border border-[rgb(55_65_81)] bg-[rgb(17_24_39)] p-2 text-sm text-[rgb(243_244_246)] placeholder:text-[rgb(156_163_175)] focus:border-[#1488fc] focus:outline-none"
                  rows={4}
                />
              </div>
              <p className="text-xs text-[rgb(156_163_175)]">
                Ton professeur verra que tu as terminé cet exercice et te mettra
                une note après correction.
              </p>
              <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(31_41_55)]">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleMarkDone}
                  disabled={saving || !reponse.trim()}
                >
                  {saving ? "Enregistrement..." : "Marquer comme fait"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {pdfModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="relative flex-1 overflow-hidden bg-white">
            <button
              onClick={closePdf}
              className="absolute top-1 right-1 z-10 rounded bg-black/60 text-red-500 hover:bg-black/80 w-5 h-5 flex items-center justify-center cursor-pointer"
            >
              X
            </button>
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Prévisualisation des exercices"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
