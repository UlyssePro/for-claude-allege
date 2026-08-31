"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SearchInput } from "@/components/ui/search-input";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

interface NoteEntry {
  id: string;
  numero: string | null;
  note1: string | null;
  note2: string | null;
  note3: string | null;
  note4: string | null;
  note5: string | null;
  matiere: { id: string; label: string; abrev?: string };
  prof: { id: string; prenom: string; nom: string };
}

export default function EleveNotesPage() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [search, setSearch] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [eleveNom, setEleveNom] = useState("");
  const [eleveClasse, setEleveClasse] = useState("");

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eleve/notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      } else {
        toast.error("Erreur lors du chargement des notes");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
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

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = note.matiere.label
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [notes, search]);

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

      doc.setFontSize(25);
      doc.text("Bulletin de notes", 130, 18);
      doc.setDrawColor(0, 0, 0);
      doc.line(131, 20, pageWidth - 103, 20);

      doc.setFontSize(10);
      doc.text(`Élève : ${eleveNom || "-"}`, 14, 32);
      doc.text(`Classe : ${eleveClasse || "-"}`, 14, 36);
      doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, 14, 40);

      const tableStartY = 44;

      const tableColumn = [
        "#",
        "N°",
        "Matière",
        "Enseignant",
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
        const values = [
          note.note1,
          note.note2,
          note.note3,
          note.note4,
          note.note5,
        ]
          .filter((v): v is string => !!v && v.trim() !== "")
          .map((v) => parseFloat(v) || 0);
        const total = values.reduce((sum, v) => sum + v, 0).toFixed(2);
        const avg =
          values.length > 0
            ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2)
            : "-";

        tableRows.push([
          String(idx + 1),
          String(note.numero ?? "-"),
          note.matiere.abrev || note.matiere.label,
          `${note.prof.prenom ?? ""} ${note.prof.nom ?? ""}`.trim() || "-",
          String(note.note1 ?? "-"),
          String(note.note2 ?? "-"),
          String(note.note3 ?? "-"),
          String(note.note4 ?? "-"),
          String(note.note5 ?? "-"),
          String(total),
          String(avg),
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
          1: { cellWidth: 15, halign: "center" },
          2: { cellWidth: 35, halign: "center" },
          3: { cellWidth: 60 },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 20, halign: "center" },
          6: { cellWidth: 20, halign: "center" },
          7: { cellWidth: 20, halign: "center" },
          8: { cellWidth: 20, halign: "center" },
          9: { cellWidth: 25, halign: "center" },
          10: { cellWidth: 20, halign: "center" },
        },
      });

      const totalPages =
        (doc.internal as any).getNumberOfPages?.() ||
        doc.internal.pages?.length ||
        1;

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
        <div className="flex items-center gap-2">
          <ExportPdfButton
            onClick={handleExportPdf}
            disabled={filteredNotes.length === 0}
          >
            <FileText className="h-4 w-4 text-white" /> PDF
          </ExportPdfButton>
        </div>
      </div>

      <Card>
        <div className="rounded-md border border-[rgb(55_65_81)] bg-[#1e1e21] overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-sm"
              style={{ tableLayout: "fixed" }}
            >
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 30 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
              </colgroup>
              <thead className="bg-[#1b2234]">
                <tr>
                  <th className="p-2 text-center text-xs font-medium text-[rgb(203_210_224)]">
                    #
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-[rgb(203_210_224)]">
                    Matière
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-[rgb(203_210_224)]">
                    Enseignant
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-[rgb(203_210_224)]">
                    N°
                  </th>
                  <th className="p-2 text-center text-xs font-medium text-[rgb(203_210_224)]">
                    Note 1
                  </th>
                  <th className="p-2 text-center text-xs font-medium text-[rgb(203_210_224)]">
                    Note 2
                  </th>
                  <th className="p-2 text-center text-xs font-medium text-[rgb(203_210_224)]">
                    Note 3
                  </th>
                  <th className="p-2 text-center text-xs font-medium text-[rgb(203_210_224)]">
                    Note 4
                  </th>
                  <th className="p-2 text-center text-xs font-medium text-[rgb(203_210_224)]">
                    Note 5
                  </th>
                  <th className="p-2 text-center text-xs font-medium text-[rgb(203_210_224)]">
                    Total
                  </th>
                  <th className="p-2 text-center text-xs font-medium text-[rgb(203_210_224)]">
                    MA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(55_65_81)]">
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-4 text-center text-[rgb(156_163_175)]"
                    >
                      Aucune note enregistrée
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((note, i) => {
                    const values = [
                      note.note1,
                      note.note2,
                      note.note3,
                      note.note4,
                      note.note5,
                    ]
                      .filter((v): v is string => !!v && v.trim() !== "")
                      .map((v) => parseFloat(v) || 0);
                    const total = values.reduce((sum, v) => sum + v, 0);
                    const avg =
                      values.length > 0
                        ? values.reduce((sum, v) => sum + v, 0) / values.length
                        : null;

                    return (
                      <tr
                        key={note.id}
                        className="hover:bg-[rgb(31_41_55)]/40 transition-colors"
                      >
                        <td className="p-2 text-center text-xs text-[rgb(156_163_175)]">
                          {i + 1}
                        </td>
                        <td className="p-2 text-xs font-medium text-[rgb(243_244_246)]">
                          {note.matiere.label}
                        </td>
                        <td className="p-2 text-xs text-[rgb(156_163_175)]">
                          {`${note.prof.prenom ?? ""} ${note.prof.nom ?? ""}`.trim() ||
                            "-"}
                        </td>
                        <td className="p-2 text-xs font-medium text-[rgb(243_244_246)]">
                          {note.numero}
                        </td>
                        <td className="p-2 text-center text-xs text-[rgb(203_210_224)]">
                          {note.note1 ?? "-"}
                        </td>
                        <td className="p-2 text-center text-xs text-[rgb(203_210_224)]">
                          {note.note2 ?? "-"}
                        </td>
                        <td className="p-2 text-center text-xs text-[rgb(203_210_224)]">
                          {note.note3 ?? "-"}
                        </td>
                        <td className="p-2 text-center text-xs text-[rgb(203_210_224)]">
                          {note.note4 ?? "-"}
                        </td>
                        <td className="p-2 text-center text-xs text-[rgb(203_210_224)]">
                          {note.note5 ?? "-"}
                        </td>
                        <td className="p-2 text-center text-xs font-semibold text-blue-200">
                          {total.toFixed(2)}
                        </td>
                        <td className="p-2 text-center text-xs font-semibold text-yellow-500">
                          {avg !== null ? avg.toFixed(2) : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="sticky bottom-0 z-10 bg-[#161922]">
                  <td
                    colSpan={11}
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
    </div>
  );
}
