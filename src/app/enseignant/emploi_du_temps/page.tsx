"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, RotateCcw, Pencil, FileText } from "lucide-react";
import { getClasseColor, getClasseColorRgb } from "@/lib/badge-colors";
import { convertDayToLetter } from "@/lib/fpj.utils";
import { showConfirmToast } from "@/lib/toast.actions";
import { Card } from "@/components/ui/card";
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

const HORAIRE_ID_BY_POSITION: Record<number, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "0",
  5: "4",
  6: "5",
  7: "6",
  8: "7",
  9: "8",
};

interface ClasseRef {
  id: string;
  label: string;
}

interface EdtEntry {
  id?: string;
  position: number;
  jour: number;
  classeId: string;
  isOwner?: boolean;
}

export default function EmploiDuTempsPage() {
  const [classes, setClasses] = useState<ClasseRef[]>([]);
  const [entries, setEntries] = useState<EdtEntry[]>([]);
  const [enseignantNom, setEnseignantNom] = useState("");
  const [refsLoaded, setRefsLoaded] = useState(false);
  const [editing, setEditing] = useState<EdtEntry | null>(null);
  const [formClasseId, setFormClasseId] = useState("");
  const [edtPdfUrl, setEdtPdfUrl] = useState<string | null>(null);
  const [edtModalOpen, setEdtModalOpen] = useState(false);

  const loadRefs = async () => {
    if (refsLoaded) return;
    try {
      const res = await fetch("/api/enseignant/emploi-du-temps/refs");
      if (res.ok) {
        const refs = await res.json();
        setClasses(refs.classes || []);
        setRefsLoaded(true);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Erreur de chargement des classes");
      }
    } catch {
      toast.error("Erreur de chargement");
    }
  };

  const loadEntries = async () => {
    try {
      const res = await fetch("/api/enseignant/emploi-du-temps");
      console.log("DEBUG loadEntries status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("DEBUG loadEntries data:", data);
        const mapped: EdtEntry[] = (data || []).map((e: any) => ({
          id: e.id,
          position: e.position,
          jour: e.jour ?? 0,
          classeId: e.classeId || "",
          isOwner: !!e.isOwner,
        }));
        console.log("DEBUG loadEntries mapped:", mapped);
        setEntries(mapped);
      } else {
        console.error("DEBUG loadEntries failed:", res.status, await res.text());
      }
    } catch {
      toast.error("Erreur lors du chargement de l'emploi du temps");
    }
  };

  useEffect(() => {
    loadRefs();
    loadEntries();
    fetch("/api/enseignant/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.enseignant?.prenom && data?.enseignant?.nom) {
          setEnseignantNom(`${data.enseignant.prenom} ${data.enseignant.nom}`);
        }
      })
      .catch(() => {});
  }, []);

  const getEntry = (jour: number, position: number) =>
    entries.find((e) => e.jour === jour && e.position === position);

  const getOwnEntry = (jour: number, position: number) =>
    entries.find((e) => e.jour === jour && e.position === position && e.isOwner);

  const openModal = (jour: number, position: number) => {
    const existing = getEntry(jour, position);
    setEditing({
      id: existing?.id,
      position,
      jour,
      classeId: existing?.classeId || "",
    });
    setFormClasseId(existing?.classeId || "");
  };

  const closeModal = () => {
    setEditing(null);
    setFormClasseId("");
  };

  const handleSaveEntry = async () => {
    if (!editing) return;
    if (!formClasseId) {
      closeModal();
      return;
    }

    const updatedEntry = {
      position: editing.position,
      jour: editing.jour,
      classeId: formClasseId,
      horaireId: HORAIRE_ID_BY_POSITION[editing.position] ?? null,
      lieuId: "",
    };

    const body = entries.map((e) => ({
      position: e.position,
      jour: e.jour,
      classeId: e.classeId || "",
      lieuId: "",
      horaireId: HORAIRE_ID_BY_POSITION[e.position] ?? null,
    }));

    const existingIndex = body.findIndex(
      (e) => e.position === editing.position && e.jour === editing.jour,
    );
    if (existingIndex >= 0) {
      body[existingIndex] = updatedEntry;
    } else {
      body.push(updatedEntry);
    }

    try {
      const res = await fetch("/api/enseignant/emploi-du-temps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Enregistré");
        await loadEntries();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      closeModal();
    }
  };

  const handleClearEntry = async (jour: number, position: number) => {
    const entry = getEntry(jour, position);
    if (!entry?.id) return;

    const confirmed = await showConfirmToast({
      title: `Supprimer ce créneau ?`,
      description: "Cette action est irréversible.",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/enseignant/emploi-du-temps?id=${entry.id}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        toast.success("Créneau supprimé");
        await loadEntries();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleReset = () => {
    setEntries([]);
  };

  const handleExportEdt = async () => {
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
      doc.text("COLLEGE PRIVE", 34, 14);
      doc.text("HOUSSEN MEMORIAL SCHOOL", 34, 18);
      doc.text("B.P 284 - TEL 034 77 401 49", 34, 22);

      doc.setFontSize(21);
      doc.text("EMPLOI DU TEMPS", 130, 19);
      doc.setDrawColor(0, 0, 0);
      doc.line(131, 21, pageWidth - 100, 21);

      doc.setFontSize(10);
      if (enseignantNom) {
        doc.text(`ENSEIGNANT : ${enseignantNom}`, 14, 36);
      }

      const tableStartY = enseignantNom ? 40 : 36;

        const header = [
          "Créneau",
          ...DAYS.map((d) => convertDayToLetter(DAYS.indexOf(d))),
        ];
        const rows: any[] = [header];

        for (
          let positionIndex = 0;
          positionIndex < SLOTS.length;
          positionIndex++
        ) {
          const position = positionIndex + 1;
          const row: any[] = [SLOTS[positionIndex]];
          for (let jourIndex = 0; jourIndex < DAYS.length; jourIndex++) {
            const entry = getOwnEntry(jourIndex, position);
            const classe = entry
              ? classes.find((c) => c.id === entry.classeId)
              : null;
            row.push(classe ? classe.label : "");
          }
          rows.push(row);
        }

        const totalEntries = entries.filter((e) => e.isOwner).length;

      autoTable(doc, {
        head: [rows[0]],
        body: rows.slice(1),
        startY: tableStartY,
        theme: "grid",
        didParseCell: (data: any) => {
          if (
            data.section === "body" &&
            data.column.index === 0 &&
            data.cell.raw === ""
          ) {
            data.cell.styles.minCellHeight = 8;
          }
          if (
            data.section === "body" &&
            data.column.index > 0 &&
            data.cell.raw
          ) {
            const rgb = getClasseColorRgb(data.cell.raw as string);
            if (rgb) {
              data.cell.styles.fillColor = rgb;
            }
          }
        },
        styles: {
          fontSize: 16,
          cellPadding: { top: 3, bottom: 3 },
          halign: "center",
          valign: "middle",
          textColor: [30, 30, 20],
          lineColor: [180, 180, 180],
          lineWidth: 0.2,
          minCellHeight: 4.23,
        },
        headStyles: {
          fontSize: 13,
          fillColor: [120, 120, 120],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { halign: "center", valign: "middle", cellWidth: 47 },
          1: { halign: "center", valign: "middle", cellWidth: 37 },
          2: { halign: "center", valign: "middle", cellWidth: 37 },
          3: { halign: "center", valign: "middle", cellWidth: 37 },
          4: { halign: "center", valign: "middle", cellWidth: 37 },
          5: { halign: "center", valign: "middle", cellWidth: 37 },
          6: { halign: "center", valign: "middle", cellWidth: 37 },
        },
        showHead: "firstPage",
      });

      const finalY = (doc as any).lastAutoTable.finalY || tableStartY;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL HEURES : ${totalEntries}`, pageWidth - 14, finalY + 8, {
        align: "right",
      });
      doc.setFont("helvetica", "normal");

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
      setEdtPdfUrl(blobUrl);
      setEdtModalOpen(true);
    } catch (error) {
      console.error("EDT export error:", error);
      toast.error("Erreur lors de la génération de l'EDT");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[rgb(243_244_246)]"> </h1>
        <div className="flex items-center gap-2 h-[2.25rem]">
          <ExportPdfButton
            onClick={handleExportEdt}
            disabled={entries.length === 0}
          >
            <FileText className="h-4 w-4" />
            PDF
          </ExportPdfButton>
        </div>
      </div>

      <Card className="h-full flex flex-col">
        <div className="h-[69.4vh] rounded-md border border-[rgb(55_65_81)] bg-[#1e1e21] overflow-x-auto">
          <table
            className="w-full text-sm"
            style={{ tableLayout: "fixed", minWidth: 920 }}
          >
            <colgroup>
              <col style={{ width: 110 }} />
              {DAYS.map((day) => (
                <col key={day} style={{ width: "calc((100% - 110px) / 6)" }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-[#1b2234]">
                <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                  Créneau
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slotLabel, positionIndex) => {
                return (
                  <tr
                    key={slotLabel}
                    className="border-t border-[rgb(55_65_81)]"
                  >
                    <td className="p-1.5 text-[11px] text-center font-medium text-[rgb(156_163_175)] bg-[#1e1e21]">
                      {slotLabel}
                    </td>
                      {DAYS.map((day, jourIndex) => {
                        const entry = getEntry(jourIndex, positionIndex + 1);
                        const classe = entry
                          ? classes.find((c) => c.id === entry.classeId)
                          : null;
                        const isOwner = !!entry?.isOwner;

                        return (
                          <td
                            key={day}
                            className={`p-1 align-top bg-[#1e1e21] ${isOwner ? "group" : ""}`}
                          >
                            <div className={`rounded border border-[rgb(55_65_81)] bg-[#1e1e21] p-1.5 min-h-12 flex items-center justify-center gap-1 ${!isOwner ? "opacity-50" : ""}`}>
                              {classe && isOwner && (
                                <Badge
                                  variant="outline"
                                  className={`${getClasseColor(classe.label || "")} px-1 py-0.5 rounded`}
                                >
                                  {classe.label}
                                </Badge>
                              )}
                              {classe && !isOwner && (
                                <span className="text-xs text-[rgb(203_210_224)]">
                                  {classe.label}
                                </span>
                              )}
                              {isOwner && !entry && (
                                <div className="hidden group-hover:flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      openModal(jourIndex, positionIndex + 1)
                                    }
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                              {isOwner && entry && (
                                <div className="hidden group-hover:flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      openModal(jourIndex, positionIndex + 1)
                                    }
                                  >
                                    <Pencil className="h-2 w-2" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-[rgb(241_68_68)]"
                                    onClick={() =>
                                      handleClearEntry(
                                        jourIndex,
                                        positionIndex + 1,
                                      )
                                    }
                                  >
                                    ✕
                                  </Button>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[rgb(243_244_246)]">
              {editing
                ? `Créneau ${editing.position} - ${DAYS[editing.jour]}`
                : "Créneau"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-[rgb(156_163_175)]">Classe</label>
              <Select value={formClasseId} onValueChange={setFormClasseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Annuler
              </Button>
              <Button onClick={handleSaveEntry} disabled={!formClasseId}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {edtModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="relative flex-1 overflow-hidden bg-white">
            <button
              onClick={() => {
                setEdtModalOpen(false);
                setEdtPdfUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
              className="absolute top-1 right-1 z-10 rounded bg-black/60 text-red-500 hover:bg-black/80 w-5 h-5 flex items-center justify-center cursor-pointer"
            >
              X
            </button>
            {edtPdfUrl && (
              <iframe
                src={edtPdfUrl}
                className="w-full h-full border-0"
                title="Prévisualisation EDT"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
