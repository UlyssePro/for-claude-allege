"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Save, Search, FileText } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { AddButton } from "@/components/ui/add-button";
import { Card } from "@/components/ui/card";
import numberToFrenchWords from "@/lib/number-to-words";

interface NoteEntry {
  id: string;
  eleveId: string;
  eleveNom: string;
  photo?: string | null;
  numero?: string | null;
  classe?: { id: string; label: string };
  genre?: { id: string; label: string; gen: string };
  note1: string | null;
  note2: string | null;
  note3: string | null;
  note4: string | null;
  note5: string | null;
}

interface ClasseRef {
  id: string;
  label: string;
}

interface EleveOption {
  id: string;
  firstname: string;
  lastname: string;
  numero: string;
  photo?: string | null;
  classe?: { id: string; label: string };
  genre?: { id: string; label: string; gen: string };
}

export default function EnseignantNotesPage() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [eleves, setEleves] = useState<EleveOption[]>([]);
  const [selectedEleveId, setSelectedEleveId] = useState("");
  const [search, setSearch] = useState("");
  const [classeFilter, setClasseFilter] = useState("");
  const [classes, setClasses] = useState<ClasseRef[]>([]);
  const [newNotes, setNewNotes] = useState({
    note1: "",
    note2: "",
    note3: "",
    note4: "",
    note5: "",
  });
  const [enseignantInfo, setEnseignantInfo] = useState<{
    nom?: string;
    prenom?: string;
    matiereId?: string;
    matiere?: { label?: string };
    profSess?: string;
  }>({});
  const [sessionLabel, setSessionLabel] = useState("");;

  function getElevePhotoUrl(note: NoteEntry): string {
    if (note.photo) return `/uploads/eleves/${note.photo}`;
    const classeLabel = note.classe?.label ?? "";
    const numero = note.numero ?? "";
    const gen = note.genre?.gen?.toLowerCase().startsWith("f") ? "f" : "g";
    if (classeLabel && numero) {
      return `/uploads/eleves/${classeLabel}-${numero}.png`;
    }
    return `/uploads/eleves/default-badge-${gen}.png`;
  }

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = note.eleveNom
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesClasse = !classeFilter || note.classe?.id === classeFilter;
      return matchesSearch && matchesClasse;
    });
  }, [notes, search, classeFilter]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/enseignant/notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
        if (data.enseignant) {
          setEnseignantInfo(data.enseignant);
        }
      } else {
        toast.error("Erreur lors du chargement des notes");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const loadEleves = async () => {
    try {
      const res = await fetch("/api/enseignant/eleves");
      if (res.ok) {
        const data = await res.json();
        setEleves(data || []);
      } else {
        toast.error("Erreur lors du chargement des élèves");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const loadClasses = async () => {
    try {
      const res = await fetch("/api/enseignant/emploi-du-temps/refs");
      if (res.ok) {
        const refs = await res.json();
        setClasses(refs.classes || []);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadNotes();
    loadEleves();
    loadClasses();
    fetch("/api/public/parametres?cle=session_scolaire")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.valeur) {
          setSessionLabel(data.valeur);
        }
      })
      .catch(() => {});
  }, []);

  const [adding, setAdding] = useState(false);

  const handleAddNote = async () => {
    if (!selectedEleveId) {
      toast.error("Veuillez sélectionner un élève");
      return;
    }

    const eleve = eleves.find((e) => e.id === selectedEleveId);
    if (!eleve) return;

    setAdding(true);
    try {
      const res = await fetch("/api/enseignant/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eleveId: selectedEleveId,
          matiereId: enseignantInfo.matiereId,
          note1: newNotes.note1 || null,
          note2: newNotes.note2 || null,
          note3: newNotes.note3 || null,
          note4: newNotes.note4 || null,
          note5: newNotes.note5 || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'ajout");
      }

      const saved = await res.json();

      const newEntry: NoteEntry = {
        id: saved.id || `temp-${Date.now()}`,
        eleveId: selectedEleveId,
        eleveNom: `${eleve.firstname ?? ""} ${eleve.lastname ?? ""}`.trim(),
        photo: eleve.photo,
        numero: eleve.numero,
        classe: eleve.classe,
        note1: newNotes.note1 || null,
        note2: newNotes.note2 || null,
        note3: newNotes.note3 || null,
        note4: newNotes.note4 || null,
        note5: newNotes.note5 || null,
      };

      setNotes((prev) => [...prev, newEntry]);
      setModalOpen(false);
      setSelectedEleveId("");
      setNewNotes({ note1: "", note2: "", note3: "", note4: "", note5: "" });
      toast.success("Note ajoutée");
    } catch {
      toast.error("Erreur lors de l'ajout de la note");
    } finally {
      setAdding(false);
    }
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

      doc.setFontSize(8);
      doc.text("COLLEGE PRIVE", 34, 14);
      doc.text("HOUSSEN MEMORIAL SCHOOL", 34, 18);
      doc.text("B.P 284 - TEL 034 77 401 49", 34, 22);

      const enseignantNom = [enseignantInfo?.prenom, enseignantInfo?.nom]
        .filter(Boolean)
        .join(" ");
      const matiereLabel = enseignantInfo?.matiere?.label || "";
      const anneeScolaire = sessionLabel || enseignantInfo?.profSess || "";

      doc.setFontSize(25);
      const titleText = "Notes";
      const titleX = 130;
      const titleY = 30;
      doc.text(titleText, titleX, titleY);
      const titleWidth = doc.getTextWidth(titleText);
      doc.setDrawColor(0, 0, 0);
      doc.line(titleX, titleY + 2, titleX + titleWidth, titleY + 2);
      doc.setFontSize(10);
      doc.text(
        `Date: ${new Date().toLocaleDateString("fr-FR")} - Année scolaire: ${anneeScolaire}`,
        14,
        32,
      );

      let currentY = 37;
      if (enseignantNom) {
        doc.text(`Enseignant: ${enseignantNom}`, 14, currentY);
        currentY += 5;
      }
      if (matiereLabel) {
        doc.text(`Matière: ${matiereLabel}`, 14, currentY);
        currentY += 5;
      }

      const tableStartY = currentY;

      const tableColumn = [
        "#",
        "Élève",
        "Classe",
        "N°",
        "Note 1",
        "Note 2",
        "Note 3",
        "Note 4",
        "Note 5",
        "Total",
        "MA",
      ];
      const tableRows: string[][] = [];

      filteredNotes.forEach((note, idx) => {
        const total = [
          note.note1,
          note.note2,
          note.note3,
          note.note4,
          note.note5,
        ]
          .filter((v): v is string => !!v)
          .reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
          .toFixed(2);
        tableRows.push([
          String(idx + 1),
          note.eleveNom,
          note.classe?.label ?? "-",
          note.numero ?? "-",
          String(note.note1 ?? "-"),
          String(note.note2 ?? "-"),
          String(note.note3 ?? "-"),
          String(note.note4 ?? "-"),
          String(note.note5 ?? "-"),
          String(total),
          String(parseInt(total) / 5),
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
        styles: { fontSize: 10, cellPadding: 2 },
        showHead: "firstPage",
        columnStyles: {
          0: { cellWidth: 15, halign: "center" },
          1: { cellWidth: 96 },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 16, halign: "center" },
          4: { cellWidth: 18, halign: "center" },
          5: { cellWidth: 18, halign: "center" },
          6: { cellWidth: 18, halign: "center" },
          7: { cellWidth: 18, halign: "center" },
          8: { cellWidth: 18, halign: "center" },
          9: { cellWidth: 17, halign: "center" },
          10: { cellWidth: 17, halign: "center" },
        },
      });

      const totalPages =
        (doc.internal as any).getNumberOfPages?.() ||
        doc.internal.pages?.length ||
        1;

      if (totalPages > 0) {
        doc.setPage(totalPages);
        const lastY = (doc as any).lastAutoTable?.finalY ?? pageHeight - 20;
        doc.setFontSize(15);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "italic");
        doc.text(
          `Arrêtée la liste au nombre d${filteredNotes.length > 1 ? "e " : "'"}${numberToFrenchWords(filteredNotes.length)}${filteredNotes.length > 1 ? "" : "e"} (${filteredNotes.length}) ligne${filteredNotes.length > 1 ? "s" : ""}.`,
          105,
          Math.min(lastY + 15, pageHeight - 15),
        );

        const enseignantNom = [enseignantInfo?.prenom, enseignantInfo?.nom]
          .filter(Boolean)
          .join(" ");
        const signatureX = 190;
        let signatureY = Math.min(lastY + 30, pageHeight - 1);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text("L'Enseignant, ", signatureX, signatureY);

        const signatureName =
          (enseignantInfo?.prenom || "").trim() ||
          (enseignantInfo?.nom || "").trim();
        if (signatureName) {
          try {
            const sigRes = await fetch(
              `/uploads/signatures/Signat-${enseignantNom}.png`,
            );
            if (sigRes.ok) {
              const sigBlob = await sigRes.blob();
              const sigUrl = URL.createObjectURL(sigBlob);
              const imgWidth = 18;
              const imgHeight = 8;
              signatureY += 2;
              doc.addImage(
                sigUrl,
                "PNG",
                signatureX,
                signatureY,
                imgWidth,
                imgHeight,
              );
              URL.revokeObjectURL(sigUrl);
              signatureY += imgHeight + 2;
            }
          } catch {
            // ignore signature error
          }
        }

        if (enseignantNom) {
          doc.setFontSize(10);
          doc.text(enseignantNom, signatureX, signatureY + 4);
        }
      }

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i}/${totalPages}`, 14, pageHeight - 10, {
          align: "left",
        });
        doc.text("HMS-Notes", pageWidth - 14, pageHeight - 10, {
          align: "right",
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
      }

      const pdfBytes = doc.output("arraybuffer");
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      setPdfModalOpen(true);
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const updateNote = async (
    eleveId: string,
    field: "note1" | "note2" | "note3" | "note4" | "note5",
    value: string,
  ) => {
    const numValue = value && value.trim() !== "" ? parseFloat(value) : null;

    setNotes((prev) =>
      prev.map((note) =>
        note.eleveId === eleveId ? { ...note, [field]: value } : note,
      ),
    );

    try {
      const body = {
        eleveId,
        ...(enseignantInfo.matiereId
          ? { matiereId: enseignantInfo.matiereId }
          : {}),
        [field]: numValue,
      };
      console.log("updateNote body", body);

      const res = await fetch("/api/enseignant/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        console.error("updateNote failed", err);
        toast.error(err.error || "Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-50">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            onClear={() => {
              setSearch("");
              loadNotes();
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={classeFilter} onValueChange={setClasseFilter}>
            <SelectTrigger className="h-9 w-40 bg-[#1e1e21] border-[rgb(55_65_81)] text-xs text-[rgb(203_210_224)]">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les classes</SelectItem>
              {classes.map((classe) => (
                <SelectItem key={classe.id} value={classe.id}>
                  {classe.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportPdfButton onClick={handleExportPdf}>
            <FileText className="h-4 w-4" />
            PDF
          </ExportPdfButton>
          <AddButton onClick={() => setModalOpen(true)}>Ajouter</AddButton>
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
                <col style={{ width: 36 }} />
                <col style={{ width: 44 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 30 }} />
                <col style={{ width: 30 }} />
                <col style={{ width: 40 }} />
                <col style={{ width: 40 }} />
                <col style={{ width: 40 }} />
                <col style={{ width: 40 }} />
                <col style={{ width: 40 }} />
                <col style={{ width: 30 }} />
                <col style={{ width: 30 }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-[#1b2234]">
                <tr className="h-[2rem]">
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    #
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]" />
                  <th className="p-1.5 text-left text-[11px] font-medium text-[rgb(203_210_224)]">
                    Prénoms
                  </th>
                  <th className="p-1.5 text-left text-[11px] font-medium text-[rgb(203_210_224)]">
                    Classe
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Numero
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Note 1
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Note 2
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Note 3
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Note 4
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Note 5
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Total
                  </th>
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    MA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(55_65_81)]">
                {filteredNotes.map((note, i) => {
                  const total = [
                    note.note1,
                    note.note2,
                    note.note3,
                    note.note4,
                    note.note5,
                  ]
                    .filter((v): v is string => !!v)
                    .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

                  return (
                    <tr
                      key={note.id}
                      className="hover:bg-[rgb(31_41_55)]/40 transition-colors h-[3rem]"
                    >
                      <td className="p-1.5 text-center align-middle text-[11px] text-[rgb(156_163_175)]">
                        {i + 1}
                      </td>
                      <td className="p-1.5 align-middle">
                        <img
                          src={getElevePhotoUrl(note)}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes("default-badge")) {
                              const gen = note.genre?.gen
                                ?.toLowerCase()
                                .startsWith("f")
                                ? "f"
                                : "g";
                              target.src = `/uploads/eleves/default-badge-${gen}.png`;
                            }
                          }}
                        />
                      </td>
                      <td className="p-1.5 text-[11px] font-medium text-[rgb(156_163_175)]">
                        {note.eleveNom}
                      </td>
                      <td className="p-1.5 text-[11px] text-[rgb(203_210_224)]">
                        {note.classe?.label ? (
                          <span className="inline-flex items-center rounded-full bg-[#1b2234] px-2 py-0.5 text-[10px] font-medium text-[rgb(156_163_175)]">
                            {note.classe.label}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-1.5 text-center text-[11px] text-[rgb(156_163_175)]">
                        {note.numero ?? "-"}
                      </td>
                      {(
                        ["note1", "note2", "note3", "note4", "note5"] as const
                      ).map((field) => (
                        <td key={field} className="p-1 align-middle">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.01"
                            value={note[field] ?? ""}
                            onChange={(e) =>
                              updateNote(note.eleveId, field, e.target.value)
                            }
                            className="w-full rounded border border-[rgb(55_65_81)] bg-[#1e1e21] px-2 py-1 text-center text-xs text-[rgb(203_210_224)] outline-none focus:border-[#1488fc]"
                            placeholder="-"
                          />
                        </td>
                      ))}
                      <td className="p-1.5 text-center text-[11px] font-semibold text-blue-200">
                        {total.toFixed(2)}
                      </td>
                      <td className="p-1.5 text-center text-[11px] font-semibold text-yellow-500">
                        {(total / 5).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="sticky bottom-0 z-10 bg-[#161922]">
                  <td
                    colSpan={12}
                    className="pl-5 py-[6px] text-left italic text-xs text-[rgb(179,178,177)]"
                  >{`${filteredNotes.length} Element${filteredNotes.length > 1 ? "s" : ""} trouvé${filteredNotes.length > 1 ? "s" : ""} sur ${filteredNotes.length}.`}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Card>

      {pdfModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="relative flex-1 overflow-hidden bg-white">
            <button
              onClick={() => {
                setPdfModalOpen(false);
                setPdfUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
              className="absolute top-1 right-1 z-10 rounded bg-black/60 text-red-500 hover:bg-black/80 w-5 h-5 flex items-center justify-center cursor-pointer"
            >
              X
            </button>
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Prévisualisation des notes"
              />
            )}
          </div>
        </div>
      )}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[rgb(243_244_246)]">
              Ajouter une note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-[rgb(156_163_175)]">Élève</label>
              <Select
                value={selectedEleveId}
                onValueChange={setSelectedEleveId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un élève" />
                </SelectTrigger>
                <SelectContent>
                  {eleves
                    .filter(
                      (eleve) => !notes.some((n) => n.eleveId === eleve.id),
                    )
                    .map((eleve) => (
                      <SelectItem key={eleve.id} value={eleve.id}>
                        {eleve.firstname} {eleve.lastname}
                        {eleve.classe ? ` - ${eleve.classe.label}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-[rgb(156_163_175)]">
                  Note 1
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={newNotes.note1}
                  onChange={(e) =>
                    setNewNotes({ ...newNotes, note1: e.target.value })
                  }
                  className="w-full rounded border border-[rgb(55_65_81)] bg-[#1e1e21] px-2 py-1 text-sm text-[rgb(203_210_224)] outline-none focus:border-[#1488fc]"
                  placeholder="-"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[rgb(156_163_175)]">
                  Note 2
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={newNotes.note2}
                  onChange={(e) =>
                    setNewNotes({ ...newNotes, note2: e.target.value })
                  }
                  className="w-full rounded border border-[rgb(55_65_81)] bg-[#1e1e21] px-2 py-1 text-sm text-[rgb(203_210_224)] outline-none focus:border-[#1488fc]"
                  placeholder="-"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[rgb(156_163_175)]">
                  Note 3
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={newNotes.note3}
                  onChange={(e) =>
                    setNewNotes({ ...newNotes, note3: e.target.value })
                  }
                  className="w-full rounded border border-[rgb(55_65_81)] bg-[#1e1e21] px-2 py-1 text-sm text-[rgb(203_210_224)] outline-none focus:border-[#1488fc]"
                  placeholder="-"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[rgb(156_163_175)]">
                  Note 4
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={newNotes.note4}
                  onChange={(e) =>
                    setNewNotes({ ...newNotes, note4: e.target.value })
                  }
                  className="w-full rounded border border-[rgb(55_65_81)] bg-[#1e1e21] px-2 py-1 text-sm text-[rgb(203_210_224)] outline-none focus:border-[#1488fc]"
                  placeholder="-"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[rgb(156_163_175)]">
                  Note 5
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={newNotes.note5}
                  onChange={(e) =>
                    setNewNotes({ ...newNotes, note5: e.target.value })
                  }
                  className="w-full rounded border border-[rgb(55_65_81)] bg-[#1e1e21] px-2 py-1 text-sm text-[rgb(203_210_224)] outline-none focus:border-[#1488fc]"
                  placeholder="-"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddNote} disabled={adding}>
                {adding ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
