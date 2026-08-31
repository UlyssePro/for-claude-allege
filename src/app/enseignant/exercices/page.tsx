"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { RowActions } from "@/components/ui/row-actions";
import { FileText, ClipboardList, LockOpen, Lock } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { getClasseColor } from "@/lib/badge-colors";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { CustomTable } from "@/components/ui/custom-table";
import { showConfirmToast } from "@/lib/toast.actions";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";
import { usePdfPreview } from "@/hooks/use-pdf-preview";

interface ClasseItem {
  id: string;
  label: string;
}

interface PratiqueItem {
  id: string;
  titre: string;
  classe: string | null;
  classeId: string | null;
  date: string | null;
  horaireLabel: string | null;
  lieuLabel: string | null;
  matiereLabel: string | null;
  statut: string | null;
  debloque: boolean;
  task: string | null;
}

interface EleveSuivi {
  id: string;
  firstname: string;
  lastname: string;
  fait: boolean;
  note: string | null;
  reponse: string | null;
}

export default function EnseignantExercicesPage() {
  const [items, setItems] = useState<PratiqueItem[]>([]);
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classeFilter, setClasseFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [suivisModalOpen, setSuivisModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PratiqueItem | null>(null);
  const [elevesSuivis, setElevesSuivis] = useState<EleveSuivi[]>([]);
  const [savingSuivis, setSavingSuivis] = useState(false);
  const [enseignantId, setEnseignantId] = useState<string>("");
  const { modePdf: pdfModalOpen, pdfUrl, openPdf, closePdf } = usePdfPreview();
  const [enseignantNom, setEnseignantNom] = useState("");

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classeFilter) params.set("classeId", classeFilter);

      const res = await fetch(
        `/api/enseignant/exercices/pratiques?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.enseignant?.id) {
          setEnseignantId(data.enseignant.id);
        }
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error || "Erreur lors du chargement");
      }
    } catch {
      toast.error("Erreur réseau lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await fetch("/api/enseignant/grilles/refs");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch {
      // ignore
    }
  };

  const reloadSuivis = useCallback(async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(
        `/api/enseignant/exercices/suivis?repartitionId=${selectedItem.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        setElevesSuivis(data.eleves || []);
      }
    } catch {
      // ignore
    }
  }, [selectedItem]);

  useEffect(() => {
    loadItems();
    loadClasses();
    fetch("/api/enseignant/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.enseignant?.prenom && data?.enseignant?.nom) {
          setEnseignantNom(`${data.enseignant.prenom} ${data.enseignant.nom}`);
        }
      })
      .catch(() => {});
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search ||
        (item.titre || "").toLowerCase().includes(search.toLowerCase());
      const matchesClasse = !classeFilter || item.classeId === classeFilter;
      const matchesDate =
        !dateFilter || (item.date || "").startsWith(dateFilter);
      return matchesSearch && matchesClasse && matchesDate;
    });
  }, [items, search, classeFilter, dateFilter]);

  const openSuivisModal = async (item: PratiqueItem) => {
    setSelectedItem(item);
    setSuivisModalOpen(true);
    setElevesSuivis([]);
    try {
      const res = await fetch(
        `/api/enseignant/exercices/suivis?repartitionId=${item.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        setElevesSuivis(data.eleves || []);
      } else {
        toast.error("Erreur lors du chargement des suivis");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleToggleDebloque = async (item: PratiqueItem) => {
    try {
      const res = await fetch(
        `/api/enseignant/exercices/pratiques?id=${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ debloque: !item.debloque }),
        },
      );
      if (res.ok) {
        toast.success(
          !item.debloque ? "Pratique débloquée" : "Pratique rébloquée",
        );
        loadItems();
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error || "Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("l", "mm", "a4");

      await addSchoolPdfHeader(doc, {
        title: "LISTE DES PRATIQUES",
        countLabel: `${filteredItems.length} PRATIQUES`,
        lineStart: 14,
        lineEndOffset: 14,
      });

      doc.setFontSize(10);
      doc.text(`Enseignant : ${enseignantNom || "-"}`, 14, 32);

      const tableColumn = [
        "#",
        "Titre",
        "Classe",
        "Date",
        "Horaire",
        "Lieu",
        "Matiere",
        "Statut",
      ];
      const tableRows: string[][] = [];

      filteredItems.forEach((item, idx) => {
        tableRows.push([
          String(idx + 1),
          item.titre || "-",
          item.classe || "-",
          item.date || "-",
          item.horaireLabel || "-",
          item.lieuLabel || "-",
          item.matiereLabel || "-",
          item.debloque ? "Débloqué" : "Bloqué",
        ]);
      });

      autoTable(doc, {
        startY: 36,
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
          0: { cellWidth: 15, halign: "center" },
          1: { cellWidth: 79 },
          2: { cellWidth: 25, halign: "center" },
          3: { cellWidth: 25, halign: "center" },
          4: { cellWidth: 25, halign: "center" },
          5: { cellWidth: 45, halign: "center" },
          6: { cellWidth: 30, halign: "center" },
          7: { cellWidth: 25, halign: "center" },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Pratiques");

      openPdf(doc);
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleSaveSuivis = async () => {
    if (!selectedItem) return;
    setSavingSuivis(true);
    try {
      const res = await fetch("/api/enseignant/exercices/suivis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repartitionId: selectedItem.id,
          eleves: elevesSuivis.map((e) => ({
            eleveId: e.id,
            fait: e.fait,
            note: e.note || null,
          })),
        }),
      });

      if (res.ok) {
        toast.success("Suivis enregistrés");
        setSuivisModalOpen(false);
        setSelectedItem(null);
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error || "Erreur lors de l'enregistrement des suivis");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSavingSuivis(false);
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
        <div className="flex items-center gap-3">
          <Select value={classeFilter} onValueChange={setClasseFilter}>
            <SelectTrigger className="h-9 w-40 bg-[#1e1e21] border-[#1e293b] text-xs text-[rgb(203_210_224)]">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 rounded-[var(--radius-sm)] border border-[#1e293b] h-9 w-40 text-center bg-[#1e1e21] border-[#1e293b] text-xs text-[rgb(203_210_224)]"
          />
          <ExportPdfButton
            onClick={handleExportPdf}
            disabled={filteredItems.length === 0}
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
                accessor: (_, idx) => (
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
                width: "340px",
              },
              {
                header: "Classe",
                accessor: (e) => {
                  const classeItem = classes.find((c) => c.id === e.classeId);
                  return classeItem ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${getClasseColor(classeItem.label)}`}
                    >
                      {classeItem.label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[rgb(156_163_175)]">
                      -
                    </span>
                  );
                },
                width: "50px",
                className: "text-center",
              },
              {
                header: "Date",
                accessor: (e) =>
                  e.date ? (
                    <span className="text-[11px] text-center text-[rgb(203_210_224)]">
                      {e.date}
                    </span>
                  ) : (
                    <span className="text-[11px] text-center text-[rgb(156_163_175)]">
                      -
                    </span>
                  ),
                width: "60px",
                className: "text-left",
              },
              {
                header: "Actions",
                accessor: (e) => (
                  <RowActions
                    actions={[
                      {
                        label: e.debloque ? "Rébloquer" : "Débloquer",
                        onClick: () => handleToggleDebloque(e),
                        icon: e.debloque ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <LockOpen className="w-4 h-4" />
                        ),
                      },
                      {
                        label: "Suivis",
                        onClick: () => openSuivisModal(e),
                        icon: <ClipboardList className="w-4 h-4" />,
                      },
                    ]}
                  />
                ),
                className: "text-right",
                width: "30px",
              },
            ]}
            data={filteredItems}
          />
        </CardContent>
      </Card>

      <Dialog open={suivisModalOpen} onOpenChange={setSuivisModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suivis de la pratique</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-[rgb(203_210_224)]">
                  <span className="font-medium">Titre :</span>{" "}
                  {selectedItem.titre}
                </p>
                <p className="text-sm text-[rgb(156_163_175)] mt-1">
                  <span className="font-medium">Classe :</span>{" "}
                  {selectedItem.classe || "-"}
                </p>
                {selectedItem.date && (
                  <p className="text-xs text-[rgb(156_163_175)] mt-1">
                    <span className="font-medium">Date :</span>{" "}
                    {selectedItem.date}
                  </p>
                )}
              </div>
              <div className="border-t border-[rgb(31_41_55)] pt-4">
                <Label className="text-sm font-medium text-[rgb(203_210_224)] mb-3 block">
                  Élèves
                </Label>
                {elevesSuivis.length === 0 ? (
                  <p className="text-sm text-[rgb(156_163_175)]">
                    Aucun élève dans cette classe.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {elevesSuivis.map((eleve) => (
                      <div
                        key={eleve.id}
                        className="flex flex-col gap-2 p-2 rounded-lg border border-[rgb(31_41_55)] bg-[rgb(17_24_39)]"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={eleve.fait}
                            onChange={(e) =>
                              setElevesSuivis((prev) =>
                                prev.map((el) =>
                                  el.id === eleve.id
                                    ? { ...el, fait: e.target.checked }
                                    : el,
                                ),
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-[#1488fc] focus:ring-[#1488fc]"
                          />
                          <span className="flex-1 text-sm text-[rgb(243_244_246)]">
                            {eleve.firstname} {eleve.lastname}
                          </span>
                          <Input
                            placeholder="Note sur 20"
                            value={eleve.note || ""}
                            onChange={(e) =>
                              setElevesSuivis((prev) =>
                                prev.map((el) =>
                                  el.id === eleve.id
                                    ? { ...el, note: e.target.value }
                                    : el,
                                ),
                              )
                            }
                            className="w-24 h-8 text-xs"
                          />
                        </div>
                        {eleve.reponse && (
                          <div className="ml-7 text-xs text-[rgb(156_163_175)] bg-[rgb(31_41_55)] rounded p-2">
                            <span className="font-medium text-[rgb(203_210_224)]">
                              Réponse :
                            </span>{" "}
                            {eleve.reponse}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(31_41_55)]">
                <Button
                  variant="secondary"
                  onClick={() => setSuivisModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button onClick={handleSaveSuivis} disabled={savingSuivis}>
                  {savingSuivis ? "Enregistrement..." : "Enregistrer"}
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
                title="Prévisualisation des pratiques"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
