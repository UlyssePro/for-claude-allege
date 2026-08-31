"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  FileText,
  ClipboardList,
} from "lucide-react";
import { getClasseColorRgb, getMatiereColor } from "@/lib/badge-colors";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";

const SLOTS = [
  "06h45 - 07h45",
  "07h45 - 08h45",
  "08h45 - 09h45",
  "09h45 - 10h00",
  "10h00 - 11h00",
  "11h00 - 12h00",
  "14h30 - 15h30",
  "15h30 - 16h30",
  "16h30 - 17h30",
];

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface EdtEntry {
  id?: string;
  position: number;
  jour: number;
  matiereId?: string;
  classeId?: string;
  enseignantId?: string;
  matiere?: { id?: string; label?: string; abrev?: string };
  enseignant?: { id?: string; nom?: string; prenom?: string };
  isTeacherEntry?: boolean;
}

interface MatiereRef {
  id: string;
  label: string;
  abrev: string;
  coeff: string;
}

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  for (let i = 0; i < 6; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateFr(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function EleveEmploiDuTempsPage() {
  const [entries, setEntries] = useState<EdtEntry[]>([]);
  const [matieres, setMatieres] = useState<MatiereRef[]>([]);
  const [enseignants, setEnseignants] = useState<
    { id: string; nom: string; prenom: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editing, setEditing] = useState<EdtEntry | null>(null);
  const [formMatiereId, setFormMatiereId] = useState("");
  const [modePdf, setModePdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [repartitionDetails, setRepartitionDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [filterClasseId, setFilterClasseId] = useState<string>("");
  const [filterMatiereId, setFilterMatiereId] = useState<string>("all");
  const [filterEnseignantId, setFilterEnseignantId] = useState<string>("all");
  const [eleveNom, setEleveNom] = useState("");
  const [eleveClasse, setEleveClasse] = useState("");
  const [sessionLabel, setSessionLabel] = useState("");

  const weekDates = useMemo(() => getWeekDates(new Date()), []);
  const currentWeekDates = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base);
  }, [weekOffset]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eleve/emploi-du-temps");
      if (res.ok) {
        const data = await res.json();
        const mapped: EdtEntry[] = (data || []).map((e: any) => ({
          id: e.id,
          position: e.position,
          jour: e.jour ?? 0,
          matiereId: e.matiereId,
          classeId: e.classeId,
          enseignantId: e.enseignantId,
          matiere: e.matiere,
          enseignant: e.enseignant,
          isTeacherEntry: !!e.isTeacherEntry,
        }));
        setEntries(mapped);
      } else {
        toast.error("Erreur lors du chargement de l'emploi du temps");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const loadMatieres = async () => {
    try {
      const res = await fetch("/api/matieres");
      if (res.ok) {
        const data = await res.json();
        setMatieres(data || []);
      }
    } catch {
      // ignore
    }
  };

  const loadEnseignants = async () => {
    try {
      const res = await fetch("/api/enseignants");
      if (res.ok) {
        const data = await res.json();
        setEnseignants(data || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadEntries();
    loadMatieres();
    loadEnseignants();
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
    fetch("/api/public/parametres?cle=session_scolaire")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.valeur) {
          setSessionLabel(data.valeur);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editing && matieres.length === 0) {
      loadMatieres();
    }
  }, [editing, matieres.length]);

  const getEntry = (jour: number, position: number) =>
    entries.find((e) => e.jour === jour && e.position === position);

  const openModal = (jour: number, position: number) => {
    const existing = getEntry(jour, position);
    setEditing({
      id: existing?.id,
      position,
      jour,
      matiereId: existing?.matiereId || "",
      matiere: existing?.matiere,
      isTeacherEntry: existing?.isTeacherEntry || false,
    });
    setFormMatiereId(existing?.isTeacherEntry ? "" : existing?.matiereId || "");
  };

  const closeModal = () => {
    setEditing(null);
    setFormMatiereId("");
  };

  const handleSaveEntry = async () => {
    if (!editing) return;
    if (!formMatiereId) {
      closeModal();
      return;
    }

    const matiere = matieres.find((m) => m.id === formMatiereId);

    setSaving(true);
    try {
      const res = await fetch("/api/eleve/emploi-du-temps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: editing.position,
          jour: editing.jour,
          matiereId: formMatiereId,
        }),
      });

      if (res.ok) {
        setEntries((prev) => {
          const exists = prev.find(
            (e) => e.jour === editing.jour && e.position === editing.position,
          );
          if (exists) {
            return prev.map((e) =>
              e.jour === editing.jour && e.position === editing.position
                ? {
                    ...e,
                    matiereId: formMatiereId,
                    matiere: { abrev: matiere?.abrev },
                  }
                : e,
            );
          }
          return [
            ...prev,
            {
              id: undefined,
              position: editing.position,
              jour: editing.jour,
              matiereId: formMatiereId,
              matiere: { abrev: matiere?.abrev },
            },
          ];
        });
        toast.success("Matière enregistrée");
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
      closeModal();
    }
  };

  const handleClearEntry = async (jour: number, position: number) => {
    const entry = entries.find(
      (e) => e.jour === jour && e.position === position,
    );
    if (!entry?.id) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/eleve/emploi-du-temps?id=${entry.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEntries((prev) =>
          prev.filter((e) => !(e.jour === jour && e.position === position)),
        );
        toast.success("Matière supprimée");
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const fetchRepartitionDetails = async (
    cId?: string,
    mId?: string,
    eId?: string,
  ) => {
    setLoadingDetails(true);
    try {
      const params = new URLSearchParams();
      if (cId && cId !== "all") params.append("classeId", cId);
      if (mId && mId !== "all") params.append("matiereId", mId);
      if (eId && eId !== "all") params.append("enseignantId", eId);

      const queryStr = params.toString();
      if (!queryStr) {
        setRepartitionDetails([]);
        setLoadingDetails(false);
        return;
      }

      const res = await fetch(`/api/public/repartitions?${queryStr}`);
      if (res.ok) {
        const data = await res.json();
        setRepartitionDetails(Array.isArray(data) ? data : []);
      } else {
        setRepartitionDetails([]);
      }
    } catch (e) {
      console.error("Error fetching repartitions:", e);
      setRepartitionDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openDetailModal = (
    classeId?: string,
    matiereId?: string,
    enseignantId?: string,
  ) => {
    const cId = classeId || "";
    const mId = matiereId || "all";
    const eId = enseignantId || "all";

    setFilterClasseId(cId);
    setFilterMatiereId(mId);
    setFilterEnseignantId(eId);
    setDetailModalOpen(true);

    fetchRepartitionDetails(cId, mId, eId);
  };

  const handleMatiereFilterChange = (mId: string) => {
    setFilterMatiereId(mId);
    fetchRepartitionDetails(filterClasseId, mId, filterEnseignantId);
  };

  const handleEnseignantFilterChange = (eId: string) => {
    setFilterEnseignantId(eId);
    fetchRepartitionDetails(filterClasseId, filterMatiereId, eId);
  };

  const handleExportPdf = async () => {
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

      const now = new Date();
      const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      const endYear = startYear + 1;
      doc.setFontSize(8);
      doc.text("COLLEGE PRIVE", 34, 12);
      doc.text("HOUSSEN MEMORIAL SCHOOL", 34, 16);
      doc.text("B.P 284 - TEL 034 77 401 49", 34, 20);
      doc.text(`SESSION: (${sessionLabel || `${startYear} - ${endYear}`})`, 34, 24);

      doc.setFontSize(21);
      doc.text("EMPLOI DU TEMPS", 130, 19);
      doc.setDrawColor(0, 0, 0);
      doc.line(131, 21, pageWidth - 100, 21);

      doc.setFontSize(10);
      doc.text(`Élève : ${eleveNom || "-"}`, 14, 32);
      doc.text(`Classe : ${eleveClasse || "-"}`, 14, 36);
      const tableStartY = 40;

      const rows: any[] = [];
      for (let i = 0; i < SLOTS.length; i++) {
        const position = i + 1;
        const row = [SLOTS[i]];
        for (let j = 0; j < DAYS.length; j++) {
          const entry = getEntry(j, position);
          const label = entry?.matiere?.abrev || "-";
          row.push(label);
        }
        rows.push(row);
      }

      autoTable(doc, {
        head: [["Créneau", ...DAYS]],
        body: rows,
        startY: tableStartY,
        theme: "grid",
        styles: {
          fontSize: 12,
          cellPadding: { top: 4, bottom: 4 },
          halign: "center",
          valign: "middle",
          textColor: [30, 30, 20],
          lineColor: [180, 180, 180],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [120, 120, 120],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 47, halign: "center", valign: "middle" },
          1: { cellWidth: 37, halign: "center", valign: "middle" },
          2: { cellWidth: 37, halign: "center", valign: "middle" },
          3: { cellWidth: 37, halign: "center", valign: "middle" },
          4: { cellWidth: 37, halign: "center", valign: "middle" },
          5: { cellWidth: 37, halign: "center", valign: "middle" },
          6: { cellWidth: 37, halign: "center", valign: "middle" },
        },
        showHead: "firstPage",
      });

      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      (doc as any).setFontStyle?.("italic") ??
        doc.setFont("helvetica", "italic");
      doc.text(
        `Andlys's Creations - ${new Date().getFullYear()}`,
        pageWidth + 22,
        pageHeight - 4,
        {
          align: "right",
          angle: 90,
        },
      );
      (doc as any).setFontStyle?.("normal") ??
        doc.setFont("helvetica", "normal");

      const pdfBytes = doc.output("arraybuffer");
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      setModePdf(true);
    } catch {
      toast.error("Erreur lors de la génération de l'EDT");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[rgb(243_244_246)]"></h1>
        <div className="flex items-center gap-2">
          <ExportPdfButton
            onClick={handleExportPdf}
            disabled={entries.length === 0}
          >
            <FileText className="h-4 w-4" />
            PDF
          </ExportPdfButton>
        </div>
      </div>

      <Card className="h-full flex flex-col">
        <CardContent className="overflow-hidden">
          <div className="rounded-md border border-[rgb(55_65_81)] bg-[#1e1e21]">
            <Table
              className="w-full text-sm"
              style={{ tableLayout: "fixed", minWidth: 920 }}
            >
              <colgroup>
                <col style={{ width: 110 }} />
                {DAYS.map((day) => (
                  <col
                    key={day}
                    style={{ width: "calc((100% - 110px) / 6)" }}
                  />
                ))}
              </colgroup>
              <TableHeader>
                <TableRow className="bg-[#1b2234]">
                  <TableHead className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)] h-2">
                    Créneau
                  </TableHead>
                  {DAYS.map((day) => (
                    <TableHead
                      key={day}
                      className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)] h-2"
                    >
                      {day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {SLOTS.map((slot, positionIndex) => {
                  const position = positionIndex + 1;
                  return (
                    <TableRow key={slot}>
                      <TableCell className="p-1.5 text-[11px] text-center font-medium text-[rgb(156_163_175)] bg-[#1e1e21]">
                        {slot}
                      </TableCell>
                      {DAYS.map((day, jourIndex) => {
                        const entry = getEntry(jourIndex, position);
                        const matiereLabel = entry?.matiere?.abrev || "";
                        const isTeacherEntry = !!entry?.isTeacherEntry;

                        const teacherBadgeClass =
                          "bg-sky-500/15 text-sky-300 border-sky-500/30";
                        const studentBadgeClass = getMatiereColor(
                          matiereLabel,
                        );

                        return (
                          <TableCell
                            key={day}
                            className="p-1 align-top bg-[#1e1e21] group"
                          >
                            <div className="rounded border border-[rgb(55_65_81)] bg-[#1e1e21] p-1.5 min-h-12 flex items-center justify-center gap-1">
                              {matiereLabel ? (
                                <Badge
                                  variant="outline"
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${isTeacherEntry ? teacherBadgeClass : studentBadgeClass}`}
                                >
                                  {matiereLabel}
                                </Badge>
                              ) : (
                                <span className="text-[rgb(107_114_128)] text-xs"></span>
                              )}
                              <div className="hidden group-hover:flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    openModal(jourIndex, position)
                                  }
                                >
                                  {entry ? (
                                    isTeacherEntry ? (
                                      <Plus className="h-3 w-3" />
                                    ) : (
                                      <Pencil className="h-2 w-2" />
                                    )
                                  ) : (
                                    <Plus className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                {entry && !isTeacherEntry && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-[rgb(241_68_68)]"
                                    onClick={() =>
                                      handleClearEntry(jourIndex, position)
                                    }
                                  >
                                    ✕
                                  </Button>
                                )}
                                {entry && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      openDetailModal(
                                        entry.classeId,
                                        entry.matiereId,
                                        entry.enseignantId,
                                      );
                                    }}
                                    title="Voir les répartitions du professeur"
                                  >
                                    <ClipboardList className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[rgb(243_244_246)]">
              {editing ? `Créneau ${editing.position}` : "Créneau"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-[rgb(156_163_175)]">Matière</label>
              <Select value={formMatiereId} onValueChange={setFormMatiereId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-</SelectItem>
                  {matieres.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Annuler
              </Button>
              <Button
                onClick={handleSaveEntry}
                disabled={!formMatiereId || saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailModalOpen}
        onOpenChange={(open) => !open && setDetailModalOpen(false)}
      >
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[rgb(243_244_246)]">
              Répartitions du professeur
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[rgb(55_65_81)]">
            <div className="space-y-1">
              <label className="text-[11px] text-[rgb(156_163_175)] font-medium">
                Matière
              </label>
              <Select
                value={filterMatiereId}
                onValueChange={handleMatiereFilterChange}
              >
                <SelectTrigger className="h-8 text-xs bg-[#1e1e21] border-[rgb(55_65_81)]">
                  <SelectValue placeholder="Toutes les matières" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les matières</SelectItem>
                  {matieres.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label} ({m.abrev})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[rgb(156_163_175)] font-medium">
                Professeur
              </label>
              <Select
                value={filterEnseignantId}
                onValueChange={handleEnseignantFilterChange}
              >
                <SelectTrigger className="h-8 text-xs bg-[#1e1e21] border-[rgb(55_65_81)]">
                  <SelectValue placeholder="Tous les professeurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les professeurs</SelectItem>
                  {enseignants.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.nom} {prof.prenom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar-hide pt-2">
            <div className="space-y-2">
              {loadingDetails ? (
                <p className="text-xs text-[rgb(156_163_175)]">Chargement...</p>
              ) : repartitionDetails.length === 0 ? (
                <p className="text-xs text-[rgb(156_163_175)]">
                  Aucune répartition trouvée pour les filtres sélectionnés.
                </p>
              ) : (
                <div className="space-y-2">
                  {repartitionDetails.map(
                    (r: any) =>
                      r.trimestreId && (
                        <div
                          key={r.id}
                          className="relative rounded border border-[rgb(55_65_81)] bg-[#1e1e21] p-2.5 text-xs text-[rgb(203_210_224)]"
                        >
                          {r.statut === "FAIT" && (
                            <span
                              className="absolute top-2 right-2 inline-flex h-2.5 w-2.5 rounded-full bg-green-500"
                              title="Fait"
                            />
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(55_65_81)]/60 pb-1.5 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[rgb(156_163_175)]">
                                Date:
                              </span>
                              <span>
                                {r.date
                                  ? new Date(r.date).toLocaleDateString("fr-FR")
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {r.matiere && (
                                <Badge
                                  variant="outline"
                                  className={`${getMatiereColor(r.matiere.abrev || r.matiere.label)} px-1.5 py-0.5 text-[10px]`}
                                >
                                  {r.matiere.label || r.matiere.abrev}
                                </Badge>
                              )}
                              {r.enseignant && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]"
                                >
                                  Prof: {r.enseignant.nom} {r.enseignant.prenom}
                                </Badge>
                              )}
                              {r.classe && (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px]"
                                >
                                  {r.classe.label}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 border border-[rgb(55_65_81)] p-2 rounded">
                            {r.titreLabel && r.titreLabel !== "-" && (
                              <div className="mb-2 border border-[rgb(55_65_81)] rounded p-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-[#c5c222]/15 text-[#ffffff] border-[#c5c222]/30"
                                >
                                  Titre et Exercice
                                </Badge>
                                <div className="mt-2 pl-2">{r.titreLabel}</div>
                              </div>
                            )}
                            {r.objectifLabel && r.objectifLabel !== "-" && (
                              <div className="mb-2 border border-[rgb(55_65_81)] rounded p-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-[#22c55e]/15 text-[#ffffff] border-[#22c55e]/30"
                                >
                                  Objectif
                                </Badge>
                                <div className="mt-2 pl-2">
                                  {r.objectifLabel}
                                </div>
                              </div>
                            )}
                            {r.pratiqueLabel && r.pratiqueLabel !== "-" && (
                              <div className="border border-[rgb(55_65_81)] rounded p-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-[#ef4444]/15 text-[#ffffff] border-[#ef4444]/30"
                                >
                                  Pratique
                                </Badge>
                                <div className="mt-2 pl-2">
                                  {r.pratiqueLabel}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                  )}
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
              title="Prévisualisation EDT"
            />
          </div>
        </div>
      )}
    </div>
  );
}
