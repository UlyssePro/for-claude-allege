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

import { CustomTable } from "@/components/ui/custom-table";
import { RowActions } from "@/components/ui/row-actions";
import { FileText } from "lucide-react";
import { showConfirmToast } from "@/lib/toast.actions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { getClasseColor, getGenreColor } from "@/lib/badge-colors";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { AddButton } from "@/components/ui/add-button";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";
import { useAdminSession } from "@/contexts/session-context";

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

interface Classe {
  id: string;
  label: string;
}

interface Genre {
  id: string;
  label: string;
  gen: string;
}

function getClasseRank(label: string): number {
  const l = label.trim();
  if (l.startsWith("6")) return 0;
  if (l.startsWith("5")) return 1;
  if (l.startsWith("4")) return 2;
  if (l.startsWith("3")) return 3;
  if (l.startsWith("2")) return 4;
  if (
    l.startsWith("PS") ||
    l.startsWith("PT") ||
    l.startsWith("ES") ||
    l.startsWith("L")
  )
    return 5;
  if (l.startsWith("T")) return 6;
  if (l.startsWith("1")) return 5;
  return 99;
}

function sortElevesParClasseEtGenre(eleves: Eleve[]) {
  return [...eleves].sort((a, b) => {
    const oa = getClasseRank(a.classe?.label ?? "");
    const ob = getClasseRank(b.classe?.label ?? "");
    if (oa !== ob) return oa - ob;

    const ga =
      a.genre?.label === "Fille" ? 0 : a.genre?.label === "Garçon" ? 1 : 2;
    const gb =
      b.genre?.label === "Fille" ? 0 : b.genre?.label === "Garçon" ? 1 : 2;
    if (ga !== gb) return ga - gb;

    if (a.lastname !== b.lastname) return a.lastname.localeCompare(b.lastname);
    return a.firstname.localeCompare(b.firstname);
  });
}

function getElevePhotoUrl(eleve: Eleve): string {
  if (eleve.photo) return `/uploads/eleves/${eleve.photo}`;
  const classeLabel = eleve.classe?.label ?? "";
  const numero = eleve.numero ?? "";
  const gen = eleve.genre?.gen?.toLowerCase().startsWith("f") ? "f" : "g";
  if (classeLabel && numero) {
    return `/uploads/eleves/${classeLabel}-${numero}.png`;
  }
  return `/uploads/eleves/default-badge-${gen}.png`;
}

export default function ElevesPage() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEleve, setEditingEleve] = useState<Eleve | null>(null);
  const [ageValue, setAgeValue] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    dob: "",
    sob: "",
    age: "",
    genre: "",
    domic: "",
    contact: "",
    numero: "",
    obs: "",
    classeId: "",
  });
  const [filters, setFilters] = useState({
    search: "",
    classeId: "",
    genreId: "",
    sortBy: "",
    sortDir: "asc" as "asc" | "desc",
  });
  const { modePdf, pdfUrl, openPdf, closePdf } = usePdfPreview();
  const { adminSessionId } = useAdminSession();

  const fetchEleves = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.classeId) params.set("classeId", filters.classeId);
      if (filters.genreId) params.set("genreId", filters.genreId);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      params.set("sortDir", filters.sortDir);

      const res = await fetch(`/api/eleves?${params.toString()}`);
      const data = await res.json();
      setEleves(filters.sortBy ? data : sortElevesParClasseEtGenre(data));
    } catch (e) {
      toast.error("Erreur lors du chargement");
    }
  };

  const fetchRefs = async () => {
    try {
      const [cRes, gRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/genres"),
      ]);
      const [cData, gData] = await Promise.all([cRes.json(), gRes.json()]);
      setClasses(cData);
      setGenres(gData);
    } catch (e) {
      console.error("Failed to load refs", e);
    }
  };

  useEffect(() => {
    fetchEleves();
    fetchRefs();
  }, [adminSessionId]);

  const handleFilterChange = (name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    // Filtre live : on relance le fetch directement
    const params = new URLSearchParams();
    if (newFilters.search) params.set("search", newFilters.search);
    if (newFilters.classeId) params.set("classeId", newFilters.classeId);
    if (newFilters.genreId) params.set("genreId", newFilters.genreId);
    if (newFilters.sortBy) params.set("sortBy", newFilters.sortBy);
    params.set("sortDir", newFilters.sortDir);

    fetch(`/api/eleves?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setEleves(data))
      .catch((e) => {
        console.error("Fetch eleves failed:", e);
        toast.error("Erreur de chargement");
      });
  };

  const calculAge = (dob: string) => {
    if (!dob) {
      setAgeValue("");
      return;
    }
    const date = new Date(dob);
    const diff = Date.now() - date.getTime();
    const age = new Date(diff);
    const _ageValue = Math.abs(age.getUTCFullYear() - 1970);
    setAgeValue(_ageValue.toString());
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, dob: val });
    calculAge(val);
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({
      firstname: "",
      lastname: "",
      dob: "",
      sob: "",
      age: "",
      genre: "",
      domic: "",
      contact: "",
      numero: "",
      obs: "",
      classeId: "",
    });
    setAgeValue("");
    setPhotoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstname || !formData.genre) {
      toast.info("Veuillez compléter les champs obligatoires !");
      return;
    }

    const existe = eleves.some(
      (el) =>
        el.firstname.toLowerCase() === formData.firstname.toLowerCase() &&
        el.lastname.toLowerCase() === formData.lastname.toLowerCase(),
    );
    if (existe) {
      toast.error("Cet élève existe déjà !");
      return;
    }

    try {
      const res = await fetch("/api/eleves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: formData.firstname,
          lastname: formData.lastname,
          dob: formData.dob || undefined,
          contact: formData.contact || undefined,
          numero: formData.numero || undefined,
          classeId: formData.classeId || undefined,
          genreId: formData.genre || undefined,
          obs: formData.obs || undefined,
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
        await fetch(`/api/eleves/upload?id=${created.id}`, {
          method: "POST",
          body: fd,
        });
        toast.success("Élève ajouté");
        resetForm();
        setDialogOpen(false);
        fetchEleves();
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmToast({
      title: `Supprimer ${name} ?`,
      description: "Cette action est irréversible.",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/eleves?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Élève supprimé");
        fetchEleves();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    }
  };

  const isFormValid = !formData.firstname || !formData.genre;

  const handleEdit = (eleve: Eleve) => {
    setEditingEleve(eleve);
    setFormData({
      firstname: eleve.firstname,
      lastname: eleve.lastname,
      dob: eleve.dob ? new Date(eleve.dob).toISOString().split("T")[0] : "",
      sob: "",
      age: "",
      genre: eleve.genre?.id || "",
      domic: "",
      contact: eleve.contact || "",
      numero: eleve.numero || "",
      obs: "",
      classeId: eleve.classe?.id || "",
    });
    calculAge(eleve.dob ? new Date(eleve.dob).toISOString().split("T")[0] : "");
    setPhotoFile(null);
    setPhotoPreview(eleve.photo ? `/uploads/eleves/${eleve.photo}` : "");
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEleve) return;

    try {
      const res = await fetch(`/api/eleves?id=${editingEleve.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: formData.firstname,
          lastname: formData.lastname,
          dob: formData.dob || undefined,
          contact: formData.contact || undefined,
          numero: formData.numero || undefined,
          classeId: formData.classeId || undefined,
          genreId: formData.genre || undefined,
          obs: formData.obs || undefined,
        }),
      });
      if (res.ok) {
        if (photoFile && editingEleve.id) {
          const fd = new FormData();
          fd.append("photo", photoFile);
          await fetch(`/api/eleves/upload?id=${editingEleve.id}`, {
            method: "POST",
            body: fd,
          });
        }
        toast.success("Élève modifié");
        setEditDialogOpen(false);
        setEditingEleve(null);
        fetchEleves();
      } else {
        toast.error("Erreur lors de la modification");
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
        title: "LISTE DES ELEVES",
        countLabel: `${eleves.length} ELEVES`,
      });

      const tableColumn = [
        "#",
        "Nom",
        "Prénom",
        "Classe",
        "Genre",
        "N°",
        "Âge",
      ];
      const tableRows: string[][] = [];

      eleves.forEach((eleve, idx) => {
        const age = eleve.dob
          ? (() => {
              const d = new Date(eleve.dob);
              const age = new Date().getFullYear() - d.getFullYear();
              return new Date().getMonth() < d.getMonth() ||
                (new Date().getMonth() === d.getMonth() &&
                  new Date().getDate() < d.getDate())
                ? age - 1
                : age;
            })()
          : "-";
        tableRows.push([
          String(idx + 1),
          eleve.lastname || "",
          eleve.firstname || "",
          eleve.classe?.label || "-",
          eleve.genre?.label || "-",
          eleve.numero || "-",
          String(age),
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
          1: { cellWidth: 60 },
          2: { cellWidth: 50 },
          3: { cellWidth: 50, halign: "center" },
          4: { cellWidth: 40, halign: "center" },
          5: { cellWidth: 30, halign: "center" },
          6: { cellWidth: 20, halign: "center" },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Eleves");

      openPdf(doc);
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div>
      {/* Modal modification (gardé en dehors du flow normal) */}

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
            value={filters.classeId}
            onValueChange={(v) => handleFilterChange("classeId", v)}
          >
            <SelectTrigger>
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
        </div>
        <div className="min-w-32.5">
          <Select
            value={filters.genreId}
            onValueChange={(v) => handleFilterChange("genreId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les genres</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.label}
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
              <DialogTitle>Nouveau élève</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    placeholder="Nom *"
                    value={formData.lastname}
                    onChange={(e) => handleChange("lastname", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    placeholder="Prénom *"
                    value={formData.firstname}
                    onChange={(e) => handleChange("firstname", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={handleDobChange}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Lieu de naissance"
                    value={formData.sob}
                    onChange={(e) => handleChange("sob", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    value={ageValue}
                    disabled
                    placeholder="Âge"
                    className="bg-[rgb(30_41_59)]"
                  />
                </div>
                <div>
                  <Select
                    value={formData.genre}
                    onValueChange={(v) => handleChange("genre", v)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sélectionner genre</SelectItem>
                      {genres.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label} ({g.gen})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Input
                  placeholder="Domicile"
                  value={formData.domic}
                  onChange={(e) => handleChange("domic", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    placeholder="Contact"
                    value={formData.contact}
                    onChange={(e) => handleChange("contact", e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Numéro"
                    value={formData.numero}
                    onChange={(e) => handleChange("numero", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Select
                  value={formData.classeId}
                  onValueChange={(v) => handleChange("classeId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sélectionner classe</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  placeholder="Observation"
                  value={formData.obs}
                  onChange={(e) => handleChange("obs", e.target.value)}
                />
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
                    {eleves.indexOf(e) + 1}
                  </span>
                ),
                width: "50px",
                className: "text-center",
              },
              {
                header: "Photo",
                accessor: (e) => (
                  <img
                    src={getElevePhotoUrl(e)}
                    alt={`${e.firstname} ${e.lastname}`}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(ev) => {
                      const target = ev.currentTarget as HTMLImageElement;
                      const gen = e.genre?.gen?.toLowerCase().startsWith("f")
                        ? "f"
                        : "g";
                      target.src = `/uploads/eleves/default-badge-${gen}.png`;
                    }}
                  />
                ),
                width: "35px",
                className: "text-center",
              },
              {
                header: "Nom",
                accessor: (e) => (
                  <span className="text-[rgb(243_244_246)]">{e.firstname}</span>
                ),
                width: "180px",
              },
              {
                header: "Prénom",
                accessor: (e) => (
                  <span className="text-[rgb(243_244_246)]">{e.lastname}</span>
                ),
                width: "140px",
              },
              {
                header: "Classe",
                accessor: (e) =>
                  e.classe ? (
                    <Badge className={getClasseColor(e.classe.label)}>
                      {e.classe.label}
                    </Badge>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  ),
                width: "30px",
                className: "text-center",
              },
              {
                header: "Genre",
                accessor: (e) =>
                  e.genre ? (
                    <Badge className={getGenreColor(e.genre.label)}>
                      {e.genre.label}
                    </Badge>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  ),
                width: "50px",
              },
              {
                header: "N°",
                accessor: (e) => (
                  <span className="text-[#94a3b8]">{e.numero}</span>
                ),
                width: "30px",
              },
              {
                header: "Âge",
                accessor: (e) => (
                  <span className="text-[#94a3b8]">
                    {e.dob
                      ? (() => {
                          const d = new Date(e.dob);
                          const age =
                            new Date().getFullYear() - d.getFullYear();
                          return new Date().getMonth() < d.getMonth() ||
                            (new Date().getMonth() === d.getMonth() &&
                              new Date().getDate() < d.getDate())
                            ? age - 1
                            : age;
                        })()
                      : "-"}
                  </span>
                ),
                width: "30px",
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
                          handleDelete(e.id, `${e.firstname} ${e.lastname}`),
                        destructive: true,
                      },
                    ]}
                  />
                ),
                className: "text-right",
                width: "40px",
              },
            ]}
            data={eleves}
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
            <DialogTitle>Modifier l'élève</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Nom *"
                  value={formData.lastname}
                  onChange={(e) => handleChange("lastname", e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  placeholder="Prénom *"
                  value={formData.firstname}
                  onChange={(e) => handleChange("firstname", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="date"
                  value={formData.dob}
                  onChange={handleDobChange}
                />
              </div>
              <div>
                <Input
                  placeholder="Lieu de naissance"
                  value={formData.sob}
                  onChange={(e) => handleChange("sob", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  value={ageValue}
                  disabled
                  placeholder="Âge"
                  className="bg-[rgb(30_41_59)]"
                />
              </div>
              <div>
                <Select
                  value={formData.genre}
                  onValueChange={(v) => handleChange("genre", v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sélectionner genre</SelectItem>
                    {genres.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label} ({g.gen})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Input
                placeholder="Domicile"
                value={formData.domic}
                onChange={(e) => handleChange("domic", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Contact"
                  value={formData.contact}
                  onChange={(e) => handleChange("contact", e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="Numéro"
                  value={formData.numero}
                  onChange={(e) => handleChange("numero", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Select
                value={formData.classeId}
                onValueChange={(v) => handleChange("classeId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sélectionner classe</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                placeholder="Observation"
                value={formData.obs}
                onChange={(e) => handleChange("obs", e.target.value)}
              />
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
                  setEditingEleve(null);
                  resetForm();
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
