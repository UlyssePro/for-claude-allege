"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface Classe {
  id: string;
  label: string;
  categorie: { label: string } | null;
  lieu: { label: string } | null;
  _count: { eleves: number };
}

interface ClasseRef {
  id: string;
  label: string;
}

export default function ClassesPage() {
  const {
    items: classes,
    filters,
    handleFilterChange,
    createItem,
    updateItem,
    deleteItem,
  } = useCrudList<Classe, { search: string; categorieId: string; lieuId: string }>(
    "/api/classes",
    { search: "", categorieId: "", lieuId: "" },
    {
      createSuccess: "Classe ajoutée",
      createError: "Erreur lors de l'ajout",
      updateSuccess: "Classe modifiée",
      updateError: "Erreur lors de la modification",
      deleteSuccess: "Classe supprimée",
      deleteError: "Erreur lors de la suppression",
    },
  );
  const { modePdf, pdfUrl, openPdf, closePdf } = usePdfPreview();

  const [categories, setCategories] = useState<ClasseRef[]>([]);
  const [lieux, setLieux] = useState<ClasseRef[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClasse, setEditingClasse] = useState<Classe | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    categorieId: "",
    lieuId: "",
  });

  const fetchRefs = async () => {
    try {
      const res = await fetch("/api/classes/refs");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      console.error("Failed to load refs");
    }
  };

  const fetchLieux = async () => {
    try {
      const res = await fetch("/api/lieux");
      if (res.ok) {
        const data = await res.json();
        setLieux(data || []);
      }
    } catch {
      console.error("Failed to load lieux");
    }
  };

  useEffect(() => {
    fetchRefs();
    fetchLieux();
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      setFormData({ label: "", categorieId: "", lieuId: "" });
    }
  }, [dialogOpen]);

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label) {
      toast.info("Veuillez compléter le label.");
      return;
    }
    const ok = await createItem({
      label: formData.label,
      categorieId: formData.categorieId || undefined,
      lieuId: formData.lieuId || undefined,
    });
    if (ok) {
      setFormData({ label: "", categorieId: "", lieuId: "" });
      setDialogOpen(false);
    }
  };

  const handleEdit = (classe: Classe) => {
    setEditingClasse(classe);
    setFormData({
      label: classe.label,
      categorieId: classe.categorie
        ? categories.find((c) => c.label === classe.categorie?.label)?.id || ""
        : "",
      lieuId: classe.lieu ? classe.lieu.label : "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClasse) return;
    const ok = await updateItem(editingClasse.id, {
      label: formData.label,
      categorieId: formData.categorieId || undefined,
      lieuId: formData.lieuId || undefined,
    });
    if (ok) {
      setEditDialogOpen(false);
      setEditingClasse(null);
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
        title: "LISTE DES CLASSES",
        countLabel: `${classes.length} CLASSES`,
      });

      const tableColumn = ["#", "Label", "Catégorie", "Lieu", "Nb élèves"];
      const tableRows: string[][] = [];

      classes.forEach((classe, idx) => {
        tableRows.push([
          String(idx + 1),
          classe.label || "",
          classe.categorie?.label || "-",
          classe.lieu?.label || "-",
          String(classe._count.eleves),
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
          1: { cellWidth: 30 },
          2: { cellWidth: 43, halign: "center" },
          3: { cellWidth: 60, halign: "center" },
          4: { cellWidth: 30, halign: "center" },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Classes");

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
        <div className="min-w-35">
          <Select
            value={filters.categorieId}
            onValueChange={(v) => handleFilterChange("categorieId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-35">
          <Select
            value={filters.lieuId}
            onValueChange={(v) => handleFilterChange("lieuId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous lieux" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous lieux</SelectItem>
              {lieux.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <DialogTitle>Nouvelle classe</DialogTitle>
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
                <Select
                  value={formData.categorieId}
                  onValueChange={(v) => handleChange("categorieId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={formData.lieuId}
                  onValueChange={(v) => handleChange("lieuId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Lieu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun</SelectItem>
                    {lieux.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {classes.indexOf(e) + 1}
                  </span>
                ),
                width: "50px",
                className: "text-center",
              },
              {
                header: "Label",
                accessor: (c) => (
                  <span className="text-[rgb(243_244_246)]">{c.label}</span>
                ),
                width: "200px",
              },
              {
                header: "Catégorie",
                accessor: (c) =>
                  c.categorie ? (
                    <Badge variant="secondary">{c.categorie.label}</Badge>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  ),
                width: "120px",
              },
              {
                header: "Lieu",
                accessor: (c) =>
                  c.lieu ? (
                    <span className="text-[#94a3b8]">{c.lieu.label}</span>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  ),
                width: "140px",
              },
              {
                header: "Élèves",
                accessor: (c) => (
                  <span className="text-[#94a3b8]">{c._count.eleves}</span>
                ),
                width: "60px",
              },
              {
                header: "Actions",
                accessor: (c) => (
                  <RowActions
                    actions={[
                      {
                        label: "Modifier",
                        onClick: () => handleEdit(c),
                      },
                      {
                        label: "Supprimer",
                        onClick: () => handleDelete(c.id, c.label),
                        destructive: true,
                      },
                    ]}
                  />
                ),
                className: "text-right",
                width: "80px",
              },
            ]}
            data={classes}
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
            <DialogTitle>Modifier la classe</DialogTitle>
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
              <Select
                value={formData.categorieId}
                onValueChange={(v) => handleChange("categorieId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={formData.lieuId}
                onValueChange={(v) => handleChange("lieuId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Lieu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {lieux.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(31_41_55)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingClasse(null);
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
