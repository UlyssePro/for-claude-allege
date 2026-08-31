"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CustomTable } from "@/components/ui/custom-table";
import { RowActions } from "@/components/ui/row-actions";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { SearchInput } from "@/components/ui/search-input";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { AddButton } from "@/components/ui/add-button";
import { useCrudList } from "@/hooks/use-crud-list";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";

interface Matiere {
  id: string;
  label: string;
  abrev: string | null;
  _count: { notes: number };
}

export default function MatieresPage() {
  const {
    items: matieres,
    filters,
    handleFilterChange,
    createItem,
    updateItem,
    deleteItem,
  } = useCrudList<Matiere, { search: string; sortBy: string; sortDir: string }>(
    "/api/matieres",
    { search: "", sortBy: "", sortDir: "asc" },
    {
      createSuccess: "Matière ajoutée",
      createError: "Erreur lors de l'ajout",
      updateSuccess: "Matière modifiée",
      updateError: "Erreur lors de la modification",
      deleteSuccess: "Matière supprimée",
      deleteError: "Erreur lors de la suppression",
    },
  );
  const { modePdf, pdfUrl, openPdf, closePdf } = usePdfPreview();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [formData, setFormData] = useState({ label: "", abrev: "" });

  useEffect(() => {
    if (dialogOpen) {
      setFormData({ label: "", abrev: "" });
    }
  }, [dialogOpen]);

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label) {
      toast.info("Veuillez entrer le label.");
      return;
    }
    const ok = await createItem({
      label: formData.label,
      abrev: formData.abrev || undefined,
    });
    if (ok) {
      setFormData({ label: "", abrev: "" });
      setDialogOpen(false);
    }
  };

  const handleEdit = (m: Matiere) => {
    setEditingMatiere(m);
    setFormData({ label: m.label, abrev: m.abrev || "" });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatiere) return;
    const ok = await updateItem(editingMatiere.id, {
      label: formData.label,
      abrev: formData.abrev || undefined,
    });
    if (ok) {
      setEditDialogOpen(false);
      setEditingMatiere(null);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    await deleteItem(id, label);
  };

  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");

      await addSchoolPdfHeader(doc, {
        title: "LISTE DES MATIERES",
        countLabel: `${matieres.length} MATIÈRES`,
      });

      const tableColumn = ["#", "Label", "Abréviation", "Nb notes"];
      const tableRows: string[][] = [];

      matieres.forEach((matiere, idx) => {
        tableRows.push([
          String(idx + 1),
          matiere.label || "",
          matiere.abrev || "-",
          String(matiere._count.notes),
        ]);
      });

      autoTable(doc, {
        startY: 30,
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
          1: { cellWidth: 78 },
          2: { cellWidth: 40, halign: "center" },
          3: { cellWidth: 40, halign: "center" },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Matieres");

      openPdf(doc);
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-50">
          <SearchInput
            value={filters.search}
            onValueChange={(v) => handleFilterChange("search", v)}
            onClear={() => handleFilterChange("search", "")}
          />
        </div>
        <ExportPdfButton onClick={handleExportPdf}>
          <FileText className="h-4 w-4" />
          PDF
        </ExportPdfButton>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <AddButton onClick={() => setDialogOpen(true)}>Ajouter</AddButton>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle matière</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Input
                  value={formData.label}
                  onChange={(e) => handleChange("label", e.target.value)}
                  required
                  placeholder="Label"
                />
              </div>
              <div>
                <Input
                  value={formData.abrev}
                  onChange={(e) => handleChange("abrev", e.target.value)}
                  required
                  placeholder="Abréviation"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(31_41_55)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 overflow-hidden">
          <CustomTable
            columns={[
              {
                header: "#",
                accessor: (e) => (
                  <span className="text-[rgb(243_244_246)] text-center">
                    {matieres.indexOf(e) + 1}
                  </span>
                ),
                width: "50px",
                className: "text-center",
              },
              {
                header: "Label",
                accessor: (m) => (
                  <span className="text-[rgb(243_244_246)]">{m.label}</span>
                ),
                width: "220px",
              },
              {
                header: "Abréviation",
                accessor: (m) =>
                  m.abrev ? (
                    <Badge variant="secondary">{m.abrev}</Badge>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  ),
                width: "100px",
              },
              {
                header: "Notes",
                accessor: (m) => (
                  <span className="text-[#94a3b8]">{m._count.notes}</span>
                ),
                width: "70px",
              },
              {
                header: "Actions",
                accessor: (m) => (
                  <RowActions
                    actions={[
                      {
                        label: "Modifier",
                        onClick: () => handleEdit(m),
                      },
                      {
                        label: "Supprimer",
                        onClick: () => handleDelete(m.id, m.label),
                        destructive: true,
                      },
                    ]}
                  />
                ),
                className: "text-right",
                width: "80px",
              },
            ]}
            data={matieres}
          />
        </CardContent>
      </Card>

      {/* Modal modification */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogTrigger asChild>
          <div />
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la matière</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div>
              <Input
                value={formData.label}
                onChange={(e) => handleChange("label", e.target.value)}
                required
                placeholder="Label"
              />
            </div>
            <div>
              <Input
                value={formData.abrev}
                onChange={(e) => handleChange("abrev", e.target.value)}
                required
                placeholder="Abréviation"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(31_41_55)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingMatiere(null);
                  setEditDialogOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {modePdf && pdfUrl && (
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
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Prévisualisation PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
}
