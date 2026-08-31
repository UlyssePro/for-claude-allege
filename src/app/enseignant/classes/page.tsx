"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { showConfirmToast } from "@/lib/toast.actions";
import { toast } from "sonner";
import { SearchInput } from "@/components/ui/search-input";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { AddButton } from "@/components/ui/add-button";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";
import { getClasseColor, getLieuColor } from "@/lib/badge-colors";

interface Classe {
  id: string;
  label: string;
  categorie: { label: string } | null;
  lieu: { id: string; label: string } | null;
  _count: { eleves: number };
}

interface ClasseRef {
  id: string;
  label: string;
}

export default function EnseignantClassesPage() {
  const [classes, setClasses] = useState<Classe[]>([]);
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
  const [filters, setFilters] = useState({
    search: "",
    categorieId: "",
    lieuId: "",
  });
  const { modePdf, pdfUrl, openPdf, closePdf } = usePdfPreview();
  const [enseignantNom, setEnseignantNom] = useState("");

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.categorieId) params.set("categorieId", filters.categorieId);
      if (filters.lieuId) params.set("lieuId", filters.lieuId);

      const res = await fetch(`/api/enseignant/classes?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setClasses(data);
      } else if (!res.ok) {
        toast.error(data?.error || "Erreur de chargement");
      }
    } catch {
      toast.error("Erreur de chargement");
    }
  };

  const fetchRefs = async () => {
    try {
      const res = await fetch("/api/enseignant/classes/refs");
      const data = await res.json();
      setCategories(data.categories || []);
      setLieux(data.lieux || []);
    } catch {
      console.error("Failed to load refs");
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchRefs();
    fetch("/api/enseignant/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.enseignant?.prenom && data?.enseignant?.nom) {
          setEnseignantNom(`${data.enseignant.prenom} ${data.enseignant.nom}`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      setFormData({ label: "", categorieId: "", lieuId: "" });
    }
  }, [dialogOpen]);

  const handleFilterChange = (name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.search) params.set("search", newFilters.search);
    if (newFilters.categorieId)
      params.set("categorieId", newFilters.categorieId);
    if (newFilters.lieuId) params.set("lieuId", newFilters.lieuId);

    fetch(`/api/enseignant/classes?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          toast.error(data?.error || "Erreur de chargement");
        }
      })
      .catch(() => toast.error("Erreur de chargement"));
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label) {
      toast.info("Veuillez compléter le label.");
      return;
    }
    try {
      const res = await fetch("/api/enseignant/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formData.label,
          categorieId: formData.categorieId || undefined,
          lieuId: formData.lieuId || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Classe ajoutée");
        setFormData({ label: "", categorieId: "", lieuId: "" });
        setDialogOpen(false);
        fetchClasses();
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleEdit = (classe: Classe) => {
    setEditingClasse(classe);
    setFormData({
      label: classe.label,
      categorieId: classe.categorie
        ? categories.find((c) => c.label === classe.categorie?.label)?.id || ""
        : "",
      lieuId: classe.lieu ? classe.lieu.id || "" : "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClasse) return;
    try {
      const res = await fetch(
        `/api/enseignant/classes?id=${editingClasse.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: formData.label,
            categorieId: formData.categorieId || undefined,
            lieuId: formData.lieuId || undefined,
          }),
        },
      );
      if (res.ok) {
        toast.success("Classe modifiée");
        setEditDialogOpen(false);
        setEditingClasse(null);
        fetchClasses();
      } else {
        toast.error("Erreur lors de la modification");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleDelete = async (id: string, label: string) => {
    const confirmed = await showConfirmToast({
      title: `Supprimer ${label} ?`,
      description: "Cette action est irréversible.",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/enseignant/classes?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Classe supprimée");
        fetchClasses();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    }
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

      doc.setFontSize(10);
      doc.text(`Enseignant : ${enseignantNom || "-"}`, 14, 32);

      const tableColumn = ["#", "Label", "Catégorie", "Lieu", "Nb élèves"];
      const tableRows: string[][] = [];

      classes.forEach((classe, idx) => {
        tableRows.push([
          String(idx + 1),
          classe.label || "",
          classe.categorie?.label || "-",
          classe.lieu?.label || "-",
          String(classe._count?.eleves ?? 0),
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
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 40, halign: "center" },
          2: { cellWidth: 40, halign: "center" },
          3: { cellWidth: 50, halign: "center" },
          4: { cellWidth: 32, halign: "center" },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Classes");

      openPdf(doc);
    } catch (error) {
      console.error("PDF generation error:", error);
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
            {/* <AddButton onClick={() => setDialogOpen(true)}>Ajouter</AddButton> */}
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

      <Card className="flex flex-col">
        <CardContent className="max-h-[69.4vh] flex-1 overflow-hidden">
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
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getClasseColor(c.label)}`}
                  >
                    {c.label}
                  </span>
                ),
                width: "300px",
              },
              {
                header: "Catégorie",
                accessor: (c) =>
                  c.categorie ? (
                    <Badge variant="secondary">{c.categorie.label}</Badge>
                  ) : (
                    <span className="text-[rgb(107_114_128)]">-</span>
                  ),
                width: "300px",
              },
              {
                header: "Lieu",
                accessor: (c) =>
                  c.lieu ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getLieuColor(c.lieu.label)}`}
                    >
                      {c.lieu.label}
                    </span>
                  ) : (
                    <span className="text-[rgb(107_114_128)]">-</span>
                  ),
                width: "300px",
              },
              {
                header: "Élèves",
                accessor: (c) => (
                  <span className="text-[rgb(156_163_175)]">
                    {c._count?.eleves ?? 0}
                  </span>
                ),
                className: "text-center",
                width: "48px",
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
