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
  CustomTable,
} from "@/components/ui/custom-table";
import { RowActions } from "@/components/ui/row-actions";
import { FileText, ClipboardList } from "lucide-react";
import { showConfirmToast } from "@/lib/toast.actions";
import { toast } from "sonner";
import { SuivisModal } from "@/components/ui/suivis-modal";
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

interface Eleve {
  id: string;
  firstname: string;
  lastname: string;
  numero: string | null;
  contact: string | null;
  dob: string | null;
  photo: string | null;
  sob: string | null;
  domic: string | null;
  obs: string | null;
  classe: { id: string; label: string } | null;
  genre: { id: string; label: string; gen: string } | null;
}

interface ClasseRef {
  id: string;
  label: string;
}

interface GenreRef {
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

function getElevePhotoUrl(eleve: Eleve, cacheBuster?: number): string {
  const params = new URLSearchParams();
  if (cacheBuster) params.set("t", String(cacheBuster));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  if (eleve.photo) return `/uploads/eleves/${eleve.photo}${suffix}`;
  const gen = eleve.genre?.gen?.toLowerCase().startsWith("f") ? "f" : "g";
  return `/uploads/eleves/default-badge-${gen}.png${suffix}`;
}

export default function EnseignantElevesPage() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseRef[]>([]);
  const [genres, setGenres] = useState<GenreRef[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEleve, setEditingEleve] = useState<Eleve | null>(null);
  const [suiviDialogOpen, setSuiviDialogOpen] = useState(false);
  const [suiviEleve, setSuiviEleve] = useState<Eleve | null>(null);
  const [ageValue, setAgeValue] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoCacheBuster, setPhotoCacheBuster] = useState(0);
  const [modePdf, setModePdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
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
  });

  const fetchEleves = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.classeId) params.set("classeId", filters.classeId);
      if (filters.genreId) params.set("genreId", filters.genreId);

      const res = await fetch(`/api/enseignant/eleves?${params.toString()}`);
      const data = await res.json();
      setEleves(Array.isArray(data) ? data : []);
      setPhotoCacheBuster(Date.now());
    } catch (e) {
      toast.error("Erreur lors du chargement");
    }
  };

  const fetchRefs = async () => {
    try {
      const res = await fetch("/api/enseignant/eleves/refs");
      const data = await res.json();
      setClasses(data.classes || []);
      setGenres(data.genres || []);
    } catch (e) {
      console.error("Failed to load refs", e);
    }
  };

  useEffect(() => {
    fetchEleves();
    fetchRefs();
  }, []);

  const handleFilterChange = (name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.search) params.set("search", newFilters.search);
    if (newFilters.classeId) params.set("classeId", newFilters.classeId);
    if (newFilters.genreId) params.set("genreId", newFilters.genreId);

    fetch(`/api/enseignant/eleves?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setEleves(Array.isArray(data) ? data : []))
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
    setPhotoPreview("");
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
          sob: formData.sob || undefined,
          domic: formData.domic || undefined,
          obs: formData.obs || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        if (photoFile) {
          const fd = new FormData();
          fd.append("photo", photoFile);
          await fetch(`/api/eleves/upload?id=${created.id}`, {
            method: "POST",
            body: fd,
          });
        }
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
      sob: eleve.sob || "",
      age: "",
      genre: eleve.genre?.id || "",
      domic: eleve.domic || "",
      contact: eleve.contact || "",
      numero: eleve.numero || "",
      obs: eleve.obs || "",
      classeId: eleve.classe?.id || "",
    });
    calculAge(eleve.dob ? new Date(eleve.dob).toISOString().split("T")[0] : "");
    setPhotoFile(null);
    setPhotoPreview(eleve.photo ? `/uploads/eleves/${eleve.photo}` : "");
    setEditDialogOpen(true);
  };

  const handleOpenSuivi = (eleve: Eleve) => {
    setSuiviEleve(eleve);
    setSuiviDialogOpen(true);
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
          sob: formData.sob || undefined,
          domic: formData.domic || undefined,
          obs: formData.obs || undefined,
        }),
      });
      if (res.ok) {
        if (photoFile && editingEleve.id) {
          const fd = new FormData();
          fd.append("photo", photoFile);
          await fetch(`/api/eleves/upload?id=${editingEleve.id}`, { method: "POST", body: fd });
        }
        toast.success("Élève modifié");
        setEditDialogOpen(false);
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

      const doc = new jsPDF("l", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let enseignantNom = "";
      let matiereLabel = "";
      try {
        const meRes = await fetch("/api/enseignant/me");
        const meData = meRes.ok ? await meRes.json() : null;
        const ens = meData?.enseignant;
        if (ens) {
          enseignantNom = `${ens.prenom ?? ""} ${ens.nom ?? ""}`.trim();
          matiereLabel = ens.matiere?.label || "";
        }
      } catch {
        // ignore
      }

      const classeLabel = classes.find((c) => c.id === filters.classeId)?.label || "Toutes";
      const genreLabel = genres.find((g) => g.id === filters.genreId)?.label || "Tous";

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
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text("COLLEGE PRIVE", 34, 14);
      doc.text("HOUSSEN MEMORIAL SCHOOL", 34, 18);
      doc.text("B.P 284 - TEL 034 77 401 49", 34, 22);

      doc.setFontSize(21);
      doc.text("LISTE DES ÉLÈVES", 130, 19);
      doc.setDrawColor(0, 0, 0);
      doc.line(131, 21, pageWidth - 100, 21);

      const marginX = 14;
      const firstPageStartY = 55;
      const nextPageStartY = 14;
      const infoY = 33;
      const usableWidth = pageWidth - marginX * 2;
      const photoSize = 28;
      const rowPadding = 4;
      const lineHeight = 3.8;
      const rowHeight = photoSize + rowPadding * 2;
      const rowGap = 3;
      const footerHeight = 20;

      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(`CLASSE: ${classeLabel}`, marginX, infoY);
      doc.text(`GENRE: ${genreLabel}`, marginX, infoY + 5);
      doc.text(`MATIERE: ${matiereLabel || "-"}`, marginX, infoY + 10);
      doc.text(`TITULAIRE: ${enseignantNom || "-"}`, marginX, infoY + 15);
      doc.setFont("helvetica", "normal");

      const col1Start = marginX + 4;
      const col2Start = col1Start + photoSize + 8;
      const col3Start = col2Start + 75;

      const total = eleves.length;

      const getStartYForPage = (pageNumber: number) =>
        pageNumber === 1 ? firstPageStartY : nextPageStartY;

      let y = firstPageStartY;

      for (let i = 0; i < total; i++) {
        const eleve = eleves[i];
        if (!eleve) continue;

        if (y + rowHeight > pageHeight - footerHeight) {
          doc.addPage();
          y = getStartYForPage(doc.getNumberOfPages());
        }

        const borderY = y;
        const borderH = rowHeight;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        if (typeof doc.roundedRect === "function") {
          doc.roundedRect(marginX, borderY, pageWidth - marginX * 2, borderH, 2, 2, "S");
        } else {
          doc.rect(marginX, borderY, pageWidth - marginX * 2, borderH, "S");
        }

        const photoX = col1Start;
        const photoY = y + rowPadding;
        doc.setDrawColor(200, 200, 200);
        if (typeof doc.roundedRect === "function") {
          doc.roundedRect(photoX, photoY, photoSize, photoSize, 3, 3, "S");
        } else {
          doc.rect(photoX, photoY, photoSize, photoSize, "S");
        }

        try {
          const photoUrl = `/uploads/eleves/${eleve.photo || "default.png"}`;
          doc.addImage(photoUrl, "JPEG", photoX + 1, photoY + 1, photoSize - 2, photoSize - 2);
        } catch {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("Photo", photoX + photoSize / 2, photoY + photoSize / 2, { align: "center" });
        }

        const textX2 = col2Start;
        const textY = y + rowPadding + lineHeight;

        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.text(`${eleve.firstname} ${eleve.lastname}`, textX2, textY);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(`Classe: ${eleve.classe?.label || "-"}`, textX2, textY + lineHeight * 1.2);
        doc.text(`Genre: ${eleve.genre?.label || "-"}`, textX2, textY + lineHeight * 2.2);
        doc.text(`N°: ${eleve.numero || "-"}`, textX2, textY + lineHeight * 3.2);

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
        doc.text(`Âge: ${age}`, textX2, textY + lineHeight * 4.2);

        const textX3 = col3Start;
        doc.text(`Contact: ${eleve.contact || "-"}`, textX3, textY);
        doc.text(`Date naiss.: ${eleve.dob ? new Date(eleve.dob).toISOString().split("T")[0] : "-"}`, textX3, textY + lineHeight * 1.2);
        doc.text(`Lieu naiss.: ${eleve.sob || "-"}`, textX3, textY + lineHeight * 2.2);
        doc.text(`Observation: ${eleve.obs || "-"}`, textX3, textY + lineHeight * 3.2);

        y += rowHeight + rowGap;
      }

      // doc.setFontSize(10);
      // doc.setFont("helvetica", "bold");
      // doc.text(`TOTAL ÉLÈVES : ${total}`, pageWidth - 14, pageHeight - 10, {
      //   align: "right",
      // });

      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.setFont("helvetica", "italic");

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Page ${i}/${totalPages}`, 14, pageHeight - 10, { align: "left" });
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const schoolYear = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        doc.text(
          `HMS-Liste_Elèves-${schoolYear}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: "right" },
        );
        doc.text(
          `Andlys's Creations - ${new Date().getFullYear()}`,
          pageWidth + 22,
          pageHeight - 4,
          {
            align: "right",
            angle: 90,
          },
        );
      }

      doc.setFont("helvetica", "normal");

      const pdfBytes = doc.output("arraybuffer");
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      setModePdf(true);
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <><div>
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
                  {g.label} ({g.gen})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ExportPdfButton onClick={handleExportPdf} disabled={eleves.length === 0} >
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
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[rgb(45_54_78)] file:text-[rgb(203_210_224)] file:cursor-pointer file:hover:bg-[rgb(55_65_95)] text-sm text-[rgb(156_163_175)]"
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
                    src={getElevePhotoUrl(e, photoCacheBuster)}
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
                width: "48px",
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
                    <span className="text-[rgb(107_114_128)]">-</span>
                  ),
                width: "50px",
              },
              {
                header: "Genre",
                accessor: (e) =>
                  e.genre ? (
                    <Badge className={getGenreColor(e.genre.label)}>
                      {e.genre.label}
                    </Badge>
                  ) : (
                    <span className="text-[rgb(107_114_128)]">-</span>
                  ),
                width: "50px",
              },
              {
                header: "N°",
                accessor: (e) => (
                  <span className="text-[rgb(156_163_175)]">
                    {e.numero || "-"}
                  </span>
                ),
                width: "20px",
              },
              {
                header: "Âge",
                accessor: (e) => (
                  <span className="text-[rgb(156_163_175)]">
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
                width: "20px",
              },
              {
                header: "Actions",
                accessor: (e) => (
                <RowActions
                  actions={[
                    {
                      label: "Suivis",
                      onClick: () => handleOpenSuivi(e),
                      icon: <ClipboardList className="w-4 h-4" />,
                    },
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
                width: "70px",
              },
            ]}
            data={eleves}
          />
        </CardContent>
      </Card>

      {/* Modal modification */}
      <Dialog
        key={editingEleve?.id ?? "new-eleve-edit"}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingEleve(null);
          }
        }}
      >
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
                className="file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[rgb(45_54_78)] file:text-[rgb(203_210_224)] file:cursor-pointer file:hover:bg-[rgb(55_65_95)] text-sm text-[rgb(156_163_175)]"
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
    </div>
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
              title="Prévisualisation PDF"
            />
          </div>
        </div>
      )}

      <SuivisModal
        open={suiviDialogOpen}
        onOpenChange={setSuiviDialogOpen}
        eleve={suiviEleve}
      />
    </>
  );
}
