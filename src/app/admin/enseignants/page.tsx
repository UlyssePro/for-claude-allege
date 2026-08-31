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
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { getMatiereColor } from "@/lib/badge-colors";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { AddButton } from "@/components/ui/add-button";
import { useCrudList } from "@/hooks/use-crud-list";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";
import { useAdminSession } from "@/contexts/session-context";

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  contact: string | null;
  adresse: string | null;
  dpservice: string | null;
  profSess: string | null;
  photo: string | null;
  matiere: { id: string; label: string; abrev: string } | null;
  categorie: { id: string; label: string } | null;
}

interface Matiere {
  id: string;
  label: string;
  abrev: string;
}

interface Categorie {
  id: string;
  label: string;
}

export default function EnseignantsPage() {
  const { adminSessionId } = useAdminSession();
  const {
    items: enseignants,
    loading,
    filters,
    handleFilterChange,
    fetchItems: fetchEnseignants,
    deleteItem,
  } = useCrudList<
    Enseignant,
    {
      search: string;
      matiereId: string;
      categorieId: string;
      sortBy: string;
      sortDir: string;
    }
  >(
    "/api/enseignants",
    { search: "", matiereId: "", categorieId: "", sortBy: "", sortDir: "asc" },
    { deleteSuccess: "Enseignant supprimé", deleteError: "Erreur lors de la suppression" },
    adminSessionId,
  );
  const { modePdf, pdfUrl, openPdf, closePdf } = usePdfPreview();

  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEns, setEditingEns] = useState<Enseignant | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoVersion, setPhotoVersion] = useState(0);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    contact: "",
    adresse: "",
    dpservice: "",
    profSess: "",
    matiereId: "",
    categorieId: "",
  });

  const fetchRefs = async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        fetch("/api/matieres"),
        fetch("/api/classes/refs"),
      ]);
      const [mData, cData] = await Promise.all([mRes.json(), cRes.json()]);
      setMatieres(mData);
      setCategories(cData.categories || []);
    } catch {
      console.error("Failed to load refs");
    }
  };

  useEffect(() => {
    fetchRefs();
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      resetForm();
    }
  }, [dialogOpen]);

  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("l", "mm", "a4");

      await addSchoolPdfHeader(doc, {
        title: "LISTE DES ENSEIGNANTS",
        countLabel: `${enseignants.length} ENSEIGNANTS`,
      });

      const tableColumn = [
        "#",
        "Nom",
        "Prénom",
        "Matière",
        "Contact",
        "Adresse",
      ];
      const tableRows: string[][] = [];

      enseignants.forEach((ens, idx) => {
        tableRows.push([
          String(idx + 1),
          ens.nom || "",
          ens.prenom || "",
          ens.matiere?.label || "-",
          ens.contact || "-",
          ens.adresse || "-",
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
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 50, halign: "center" },
          4: { cellWidth: 50 },
          5: { cellWidth: 50 },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Enseignants");

      openPdf(doc);
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      prenom: "",
      contact: "",
      adresse: "",
      dpservice: "",
      profSess: "",
      matiereId: "",
      categorieId: "",
    });
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom) {
      toast.info("Veuillez compléter les champs obligatoires !");
      return;
    }
    try {
      const res = await fetch("/api/enseignants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom,
          prenom: formData.prenom,
          contact: formData.contact || undefined,
          adresse: formData.adresse || undefined,
          dpservice: formData.dpservice || undefined,
          profSess: formData.profSess || undefined,
          matiereId: formData.matiereId || null,
          categorieId: formData.categorieId || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const fd = new FormData();
        if (photoFile) {
          fd.append("photo", photoFile);
        } else {
          fd.append(
            "photo",
            new File([""], "default.png", { type: "image/png" }),
          );
        }
        await fetch(`/api/enseignants/upload?id=${created.id}`, {
          method: "POST",
          body: fd,
        });
        toast.success("Enseignant ajouté");
        resetForm();
        setDialogOpen(false);
        fetchEnseignants();
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteItem(id, name);
  };

  const handleEdit = (ens: Enseignant) => {
    setEditingEns(ens);
    setFormData({
      nom: ens.nom,
      prenom: ens.prenom,
      contact: ens.contact || "",
      adresse: ens.adresse || "",
      dpservice: ens.dpservice || "",
      profSess: ens.profSess || "",
      matiereId: ens.matiere?.id || "",
      categorieId: ens.categorie?.id || "",
    });
    setPhotoFile(null);
    setPhotoPreview(ens.photo ? `/uploads/enseignants/${ens.photo}` : "");
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEns) return;
    try {
      const res = await fetch(`/api/enseignants?id=${editingEns.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom,
          prenom: formData.prenom,
          contact: formData.contact || undefined,
          adresse: formData.adresse || undefined,
          dpservice: formData.dpservice || undefined,
          profSess: formData.profSess || undefined,
          matiereId: formData.matiereId || null,
          categorieId: formData.categorieId || null,
        }),
      });
      if (res.ok) {
        if (photoFile && editingEns.id) {
          const fd = new FormData();
          fd.append("photo", photoFile);
          const uploadRes = await fetch(
            `/api/enseignants/upload?id=${editingEns.id}`,
            {
              method: "POST",
              body: fd,
            },
          );
          if (!uploadRes.ok) {
            toast.error("Erreur lors de l'upload de la photo");
          }
        }
        toast.success("Enseignant modifié");
        setEditDialogOpen(false);
        setEditingEns(null);
        setPhotoFile(null);
        setPhotoPreview("");
        setPhotoVersion((v) => v + 1);
        fetchEnseignants();
      } else {
        toast.error("Erreur lors de la modification");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const isFormValid = !formData.nom || !formData.prenom;

  return (
    <div>
      {/* Bloc filtrage + actions (aligné sur une ligne) */}
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
            value={filters.matiereId}
            onValueChange={(v) => handleFilterChange("matiereId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes les matières" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les matières</SelectItem>
              {matieres.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <ExportPdfButton onClick={handleExportPdf}>
          <FileText className="h-4 w-4" />
          PDF
        </ExportPdfButton>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <AddButton onClick={() => setDialogOpen(true)}>Ajouter</AddButton>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvel enseignant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    placeholder="Nom *"
                    value={formData.nom}
                    onChange={(e) => handleChange("nom", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    placeholder="Prénom *"
                    value={formData.prenom}
                    onChange={(e) => handleChange("prenom", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Input
                  placeholder="Contact"
                  value={formData.contact}
                  onChange={(e) => handleChange("contact", e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="Adresse"
                  value={formData.adresse}
                  onChange={(e) => handleChange("adresse", e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="Département service"
                  value={formData.dpservice}
                  onChange={(e) => handleChange("dpservice", e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="Session professionnelle"
                  value={formData.profSess}
                  onChange={(e) => handleChange("profSess", e.target.value)}
                />
              </div>
              <div>
                <Select
                  value={formData.matiereId || undefined}
                  onValueChange={(v) => handleChange("matiereId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {matieres.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={formData.categorieId || undefined}
                  onValueChange={(v) => handleChange("categorieId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-[rgb(203_210_224)] mb-1">
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setPhotoFile(f);
                    setPhotoPreview(f ? URL.createObjectURL(f) : "");
                  }}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-[rgb(45_54_78)] file:text-[rgb(203_210_224)] file:cursor-pointer file:hover:bg-[rgb(55_65_95)] text-sm text-[#94a3b8]"
                />
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="mt-2 h-20 w-20 rounded-full object-cover"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(31_41_55)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isFormValid}>
                  Enregistrer
                </Button>
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
                    {enseignants.indexOf(e) + 1}
                  </span>
                ),
                width: "50px",
                className: "text-center",
              },
              {
                header: "Photo",
                accessor: (e) => {
                  const base = e.photo
                    ? `/uploads/enseignants/${e.photo}`
                    : "/uploads/enseignants/default-badge-g.png";
                  const src = `${base}?v=${photoVersion}`;
                  return (
                    <img
                      src={src}
                      alt={`${e.prenom}`}
                      className="h-8 w-8 rounded-full object-cover"
                      onError={(ev) => {
                        const target = ev.currentTarget as HTMLImageElement;
                        target.src = "/uploads/enseignants/default-badge-g.png";
                      }}
                    />
                  );
                },
                width: "48px",
                className: "text-center",
              },
              {
                header: "Nom",
                accessor: (e) => (
                  <span className="text-[rgb(243_244_246)]">{e.nom}</span>
                ),
                width: "160px",
              },
              {
                header: "Prénom",
                accessor: (e) => (
                  <span className="text-[rgb(243_244_246)]">{e.prenom}</span>
                ),
                width: "160px",
              },
              {
                header: "Matière",
                accessor: (e) =>
                  e.matiere ? (
                    <Badge className={getMatiereColor(e.matiere.label)}>
                      {e.matiere.abrev}
                    </Badge>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  ),
                width: "100px",
              },
              {
                header: "Contact",
                accessor: (e) => (
                  <span className="text-[#94a3b8]">{e.contact || "-"}</span>
                ),
                width: "130px",
              },
              {
                header: "Adresse",
                accessor: (e) => (
                  <span className="text-[#94a3b8]">{e.adresse || "-"}</span>
                ),
                width: "140px",
              },
              {
                header: "Actions",
                accessor: (e) => (
                  <RowActions
                    actions={[
                      {
                        label: "Modifier",
                        onClick: () => handleEdit(e),
                      },
                      {
                        label: "Supprimer",
                        onClick: () =>
                          handleDelete(e.id, `${e.nom} ${e.prenom}`),
                        destructive: true,
                      },
                    ]}
                  />
                ),
                className: "text-right",
                width: "100px",
              },
            ]}
            data={enseignants}
          />
        </CardContent>
      </Card>

      {/* Modal modification */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogTrigger asChild>
          <div />
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'enseignant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Nom *"
                  value={formData.nom}
                  onChange={(e) => handleChange("nom", e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  placeholder="Prénom *"
                  value={formData.prenom}
                  onChange={(e) => handleChange("prenom", e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Input
                placeholder="Contact"
                value={formData.contact}
                onChange={(e) => handleChange("contact", e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Adresse"
                value={formData.adresse}
                onChange={(e) => handleChange("adresse", e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Département service"
                value={formData.dpservice}
                onChange={(e) => handleChange("dpservice", e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Session professionnelle"
                value={formData.profSess}
                onChange={(e) => handleChange("profSess", e.target.value)}
              />
            </div>
            <div>
              <Select
                value={formData.matiereId || undefined}
                onValueChange={(v) => handleChange("matiereId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner matière" />
                </SelectTrigger>
                <SelectContent>
                  {matieres.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={formData.categorieId || undefined}
                onValueChange={(v) => handleChange("categorieId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm text-[rgb(203_210_224)] mb-1">
                Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPhotoFile(f);
                  setPhotoPreview(f ? URL.createObjectURL(f) : "");
                }}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[rgb(45_54_78)] file:text-[rgb(203_210_224)] file:cursor-pointer file:hover:bg-[rgb(55_65_95)] text-sm text-[#94a3b8]"
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="mt-2 h-20 w-20 rounded-full object-cover"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[rgb(31_41_55)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingEns(null);
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

      {loading && (
        <div className="text-center py-8 text-[#94a3b8]">Chargement...</div>
      )}

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
