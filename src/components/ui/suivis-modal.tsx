"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Dumbbell, FileText, HelpCircle, MessageSquare, Plus, User, Download } from "lucide-react";
import { getClasseColor } from "@/lib/badge-colors";

interface Suivi {
  id: string;
  type: string;
  resume: string | null;
  detail: any;
  noteId: string | null;
  quizAttemptId: string | null;
  exerciceId: string | null;
  cahierId: string | null;
  createdAt: string;
}

interface Eleve {
  id: string;
  firstname: string;
  lastname: string;
  numero: string | null;
  contact: string | null;
  dob: string | null;
  photo: string | null;
  classe: { id: string; label: string } | null;
  genre: { id: string; label: string; gen: string } | null;
}

interface SuivisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eleve: Eleve | null;
}

const SUIVI_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  lecon: {
    label: "Leçon",
    icon: <BookOpen className="h-4 w-4" />,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  exercice: {
    label: "Exercice",
    icon: <Dumbbell className="h-4 w-4" />,
    color: "bg-green-500/10 text-green-400 border-green-500/30",
  },
  note: {
    label: "Note",
    icon: <FileText className="h-4 w-4" />,
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  },
  quiz: {
    label: "Quiz",
    icon: <HelpCircle className="h-4 w-4" />,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  },
  general: {
    label: "Général",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  },
};

export function SuivisModal({ open, onOpenChange, eleve }: SuivisModalProps) {
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [modePdf, setModePdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [type, setType] = useState("general");
  const [resume, setResume] = useState("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!open || !eleve) return;
    loadSuivis();
  }, [open, eleve?.id]);

  const loadSuivis = async () => {
    if (!eleve) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/enseignant/suivis?eleveId=${eleve.id}`);
      if (res.ok) {
        const data = await res.json();
        setSuivis(data);
      } else {
        toast.error("Erreur lors du chargement des suivis");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuivi = async () => {
    if (!eleve) return;
    if (!resume.trim() && !detail.trim()) {
      toast.info("Veuillez remplir le résumé ou le détail");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/enseignant/suivis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eleveId: eleve.id,
          type,
          resume: resume.trim() || null,
          detail: detail.trim() ? { texte: detail.trim() } : null,
        }),
      });

      if (res.ok) {
        toast.success("Suivi ajouté");
        setResume("");
        setDetail("");
        setType("general");
        loadSuivis();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'ajout du suivi");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!eleve || suivis.length === 0) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("l", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      try {
        const logoRes = await fetch("/uploads/logos/logo-memo.png");
        if (logoRes.ok) {
          const logoBlob = await logoRes.blob();
          const logoUrl = URL.createObjectURL(logoBlob);
          doc.addImage(logoUrl, "PNG", 14, 8, 18, 18);
          URL.revokeObjectURL(logoUrl);
        }
      } catch {
        // ignore logo error
      }

      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text("COLLEGE PRIVE", 34, 14);
      doc.text("HOUSSEN MEMORIAL SCHOOL", 34, 18);
      doc.text("B.P 284 - TEL 034 77 401 49", 34, 22);

      doc.setFontSize(21);
      doc.text("SUIVIS ÉLÈVE", 130, 19);
      doc.setDrawColor(0, 0, 0);
      doc.line(131, 21, pageWidth - 100, 21);

      const marginX = 14;
      const infoY = 33;
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(`ÉLÈVE: ${eleve.firstname} ${eleve.lastname}`, marginX, infoY);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Classe: ${eleve.classe?.label || "-"}`,
        marginX,
        infoY + 5,
      );
      doc.text(
        `Genre: ${eleve.genre?.label || "-"}`,
        marginX,
        infoY + 10,
      );
      doc.text(
        `N°: ${eleve.numero || "-"}`,
        marginX,
        infoY + 15,
      );

      const tableStartY = infoY + 25;

      const tableColumn = ["#", "Date", "Type", "Résumé", "Détail"];
      const tableRows: string[][] = [];

      suivis.forEach((suivi, idx) => {
        const config = getTypeConfig(suivi.type);
        const date = new Date(suivi.createdAt).toLocaleDateString("fr-FR");
        const detailText =
          typeof suivi.detail === "string"
            ? suivi.detail
            : suivi.detail?.texte || JSON.stringify(suivi.detail) || "-";
        tableRows.push([
          String(idx + 1),
          date,
          config.label,
          suivi.resume || "-",
          detailText.length > 80 ? detailText.slice(0, 80) + "..." : detailText,
        ]);
      });

      autoTable(doc, {
        startY: tableStartY,
        head: [tableColumn],
        body: tableRows,
        theme: "grid",
        headStyles: {
          fillColor: [130, 130, 130],
          textColor: [255, 255, 255],
          halign: "center",
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 60 },
          4: { cellWidth: 80 },
        },
      });

      const totalPages = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.setFont("helvetica", "italic");
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Page ${i}/${totalPages}`, 14, pageHeight - 10, { align: "left" });
        doc.text(
          `HMS-Suivis-${new Date().getFullYear()}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: "right" },
        );
        doc.text(
          `Andlys's Creations - ${new Date().getFullYear()}`,
          pageWidth + 22,
          pageHeight - 4,
          {
            align: "right",
            angle: 90,
          },
        );
      }

      const pdfBytes = doc.output("arraybuffer");
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      setModePdf(true);
      onOpenChange(false);
      toast.success("PDF généré");
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeConfig = (typeStr: string) => {
    return SUIVI_TYPE_CONFIG[typeStr] || SUIVI_TYPE_CONFIG.general;
  };

  if (!eleve) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Suivis de {eleve.firstname} {eleve.lastname}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportPdf}
                disabled={exportingPdf || suivis.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exportingPdf ? "PDF..." : "PDF"}
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgb(30_41_59)]">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[rgb(243_244_246)]">
                  {eleve.firstname} {eleve.lastname}
                </span>
                <span className="text-xs text-[rgb(156_163_175)]">
                  {eleve.classe ? (
                    <Badge className={getClasseColor(eleve.classe.label)}>
                      {eleve.classe.label}
                    </Badge>
                  ) : (
                    "-"
                  )}
                  {eleve.genre && (
                    <span className="ml-2">{eleve.genre.label}</span>
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-[rgb(203_210_224)]">
                Nouveau suivi
              </Label>
              <div className="grid grid-cols-1 gap-3">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type de suivi" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUIVI_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {config.icon}
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Résumé (ex: Leçon sur les fractions)"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                />

                <Textarea
                  placeholder="Détails (optionnel)"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  className="min-h-[80px]"
                />

                <Button
                  onClick={handleAddSuivi}
                  disabled={saving}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {saving ? "Ajout..." : "Ajouter le suivi"}
                </Button>
              </div>
            </div>

            <div className="border-t border-[rgb(31_41_55)] pt-4">
              <Label className="text-sm font-medium text-[rgb(203_210_224)] mb-3 block">
                Historique des suivis
              </Label>
              {loading ? (
                <p className="text-sm text-[rgb(156_163_175)]">Chargement...</p>
              ) : suivis.length === 0 ? (
                <p className="text-sm text-[rgb(156_163_175)]">
                  Aucun suivi enregistré pour cet élève.
                </p>
              ) : (
                <div className="h-[300px] overflow-y-auto pr-4">
                  <div className="space-y-3">
                    {suivis.map((suivi) => {
                      const config = getTypeConfig(suivi.type);
                      return (
                        <div
                          key={suivi.id}
                          className="p-3 rounded-lg border border-[rgb(31_41_55)] bg-[rgb(17_24_39)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${config.color} flex items-center gap-1`}
                              >
                                {config.icon}
                                {config.label}
                              </Badge>
                              <span className="text-xs text-[rgb(156_163_175)]">
                                {formatDate(suivi.createdAt)}
                              </span>
                            </div>
                          </div>
                          {suivi.resume && (
                            <p className="mt-2 text-sm font-medium text-[rgb(243_244_246)]">
                              {suivi.resume}
                            </p>
                          )}
                          {suivi.detail && (
                            <p className="mt-1 text-sm text-[rgb(156_163_175)]">
                              {typeof suivi.detail === "string"
                                ? suivi.detail
                                : suivi.detail?.texte || JSON.stringify(suivi.detail)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {modePdf && pdfUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="relative flex-1 overflow-hidden bg-white">
            <button
              onClick={() => {
                setModePdf(false);
                setPdfUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
              className="absolute top-1 right-1 z-10 rounded bg-black/60 text-red-500 hover:bg-black/80 w-5 h-5 flex items-center justify-center cursor-pointer"
            >
              X
            </button>
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Prévisualisation PDF"
            />
          </div>
        </div>
      )}
    </>
  );
}
