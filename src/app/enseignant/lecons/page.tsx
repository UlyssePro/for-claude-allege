"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { SearchInput } from "@/components/ui/search-input";
import {
  FileText,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { showConfirmToast } from "@/lib/toast.actions";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";

interface Cahier {
  id: string;
  trimestreId: string;
  titre: string | any[];
  objectif: string | any[];
  notion: string | any[];
  exercice: string | any[];
  pratique: string | any[];
}

interface Trimestre {
  id: string;
  numero: number;
  lecon: string;
  matiereId: string;
  classeId: string;
  examen1?: string | null;
  examen2?: string | null;
  matiere?: { id: string; label: string; abrev: string } | null;
  classe?: { id: string; label: string; usualClasseId: string } | null;
  cahiers: Cahier[];
}

interface Matiere {
  id: string;
  label: string;
  abrev: string;
}

const parseJsonObjects = (value: string | any[] | undefined): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getCahierTitreObjects = (cahier: Cahier) =>
  parseJsonObjects(cahier.titre);
const getCahierObjectifObjects = (cahier: Cahier) =>
  parseJsonObjects(cahier.objectif);
const getCahierNotionObjects = (cahier: Cahier) =>
  parseJsonObjects(cahier.notion);
const getCahierExerciceObjects = (cahier: Cahier) =>
  parseJsonObjects(cahier.exercice);
const getCahierPratiqueObjects = (cahier: Cahier) =>
  parseJsonObjects(cahier.pratique);

interface UsualClasseWithTrimestres {
  id: string;
  label: string;
  usualClasseId: string;
  trimestres: Trimestre[];
}

interface FieldEditorProps {
  label: string;
  color: string;
  items: any[];
  onChange: (items: any[]) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
}

const FieldEditor = ({
  label,
  color,
  items,
  onChange,
  onAdd,
  onRemove,
}: FieldEditorProps) => {
  return (
    <div className="space-y-2 rounded-lg border border-[#2c2c30] bg-[#0d0f14] p-3">
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className="text-[10px]"
          style={{
            backgroundColor: color + "20",
            color,
            borderColor: color + "40",
          }}
        >
          {label}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="text-[10px] h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Ajouter
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.id} className="flex gap-2">
            <Input
              value={item.label || ""}
              onChange={(e) => {
                const updated = items.map((i: any) =>
                  i.id === item.id ? { ...i, label: e.target.value } : i,
                );
                onChange(updated);
              }}
              placeholder={`${label} ${item.id}`}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              className="text-[#ef4444] hover:text-[#ef4444] h-8 w-8 p-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[10px] text-[rgb(107_114_128)] italic">
            Aucun élément. Cliquez sur Ajouter.
          </p>
        )}
      </div>
    </div>
  );
};

interface TitreBlockProps {
  titre: { id: number; label: string };
  objectifs: any[];
  notions: any[];
  exercices: any[];
  pratiques: any[];
  onUpdateTitreLabel: (label: string) => void;
  onUpdateItems: (field: string, items: any[]) => void;
  onAddItem: (field: string) => void;
  onRemoveItem: (field: string, id: number) => void;
  onRemoveTitre: () => void;
}

const TitreBlock = ({
  titre,
  objectifs,
  notions,
  exercices,
  pratiques,
  onUpdateTitreLabel,
  onUpdateItems,
  onAddItem,
  onRemoveItem,
  onRemoveTitre,
}: TitreBlockProps) => {
  return (
    <div className="space-y-3 rounded-lg border border-[#2c2c30] bg-[#0d0f14] p-3">
      <div className="flex items-center gap-2">
        <Input
          value={titre.label || ""}
          onChange={(e) => onUpdateTitreLabel(e.target.value)}
          placeholder="Titre"
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveTitre}
          className="text-[#ef4444] hover:text-[#ef4444] h-8 w-8 p-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <FieldEditor
        label="Objectif"
        color="#22c55e"
        items={objectifs}
        onChange={(items) => onUpdateItems("objectif", items)}
        onAdd={() => onAddItem("objectif")}
        onRemove={(id) => onRemoveItem("objectif", id)}
      />
      <FieldEditor
        label="Notions clés"
        color="#f59e0b"
        items={notions}
        onChange={(items) => onUpdateItems("notion", items)}
        onAdd={() => onAddItem("notion")}
        onRemove={(id) => onRemoveItem("notion", id)}
      />
      <FieldEditor
        label="Exercices"
        color="#3b82f6"
        items={exercices}
        onChange={(items) => onUpdateItems("exercice", items)}
        onAdd={() => onAddItem("exercice")}
        onRemove={(id) => onRemoveItem("exercice", id)}
      />
      <FieldEditor
        label="Pratique suggérée"
        color="#ef4444"
        items={pratiques}
        onChange={(items) => onUpdateItems("pratique", items)}
        onAdd={() => onAddItem("pratique")}
        onRemove={(id) => onRemoveItem("pratique", id)}
      />
    </div>
  );
};

interface ClasseCarouselProps {
  classes: UsualClasseWithTrimestres[];
  openFiches: Set<string>;
  onToggleFiche: (key: string) => void;
  onEditTrimestre: (trimestre: Trimestre) => void;
  onDeleteTrimestre: (trimestre: Trimestre) => void;
  onActiveClassChange: (count: number) => void;
  onCurrentClasseChange: (classe: UsualClasseWithTrimestres) => void;
}

const ClasseCarousel = ({
  classes,
  openFiches,
  onToggleFiche,
  onEditTrimestre,
  onDeleteTrimestre,
  onActiveClassChange,
  onCurrentClasseChange,
}: ClasseCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = (index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goPrev = () => {
    goTo((currentIndex - 1 + classes.length) % classes.length);
  };

  const goNext = () => {
    goTo((currentIndex + 1) % classes.length);
  };

  const currentClasse = classes[currentIndex];
  const sortedClasseTrimestres = [...currentClasse.trimestres].sort(
    (a, b) => a.numero - b.numero,
  );

  useEffect(() => {
    onActiveClassChange(sortedClasseTrimestres.length);
  }, [currentIndex, sortedClasseTrimestres.length, onActiveClassChange]);

  useEffect(() => {
    onCurrentClasseChange(currentClasse);
  }, [currentClasse, onCurrentClasseChange]);

  return (
    <div className="relative h-[69.4vh] ">
      <div className="absolute inset-y-0 left-0 z-10 flex items-center">
        <button
          onClick={goPrev}
          className="rounded-full bg-[#1b2234] p-2 text-[rgb(203_210_224)] hover:bg-[#1a1a24] transition-colors border border-[#2c2c30]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute inset-y-0 right-0 z-10 flex items-center">
        <button
          onClick={goNext}
          className="rounded-full bg-[#1b2234] p-2 text-[rgb(203_210_224)] hover:bg-[#1a1a24] transition-colors border border-[#2c2c30]"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex h-full flex-col px-12">
        <div className="sticky top-0 z-10 border-b border-[#2c2c30] bg-[#1b2234] px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[rgb(243_244_246)]">
              {currentClasse.label || "Sans classe"}
            </h3>
            <span className="text-xs text-[rgb(156_163_175)]">
              {currentIndex + 1} / {classes.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 scrollbar-none scrollbar-thumb-[rgb(13_18_107)]/30 scrollbar-track-transparent scrollbar-thumb-rounded-full">
          {sortedClasseTrimestres.length === 0 ? (
            <div className="px-4 py-3 text-xs text-[rgb(107_114_128)]">
              Aucun trimestre pour cette classe
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedClasseTrimestres.map((trimestre) => {
                const trimestreLabel = `${trimestre.numero === 1 ? "1er" : `${trimestre.numero}e`} Trimestre`;

                return (
                  <div
                    key={trimestre.id}
                    className="rounded-lg border border-[#2c2c30] bg-[#111114] p-4 hover:bg-[#161718] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-full">
                        <div className="flex items-center justify-between text-xs text-[#df61f8]">
                          <div>{trimestreLabel}</div>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditTrimestre(trimestre)}
                              className="text-[10px] h-7 px-2 bg-[#242526] text-[#5968f1]"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteTrimestre(trimestre)}
                              className="text-[10px] h-7 px-2 bg-[#242526] text-[#ef4444] ml-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="w-full mt-2 text-[11px] text-[rgb(243_244_246)]">
                          {trimestre.lecon || "Sans lecon"}
                        </div>
                      </div>
                    </div>
                    {(trimestre.cahiers || []).length > 0 && (
                      <div className="mt-4 space-y-3">
                        {(trimestre.cahiers || []).map((cahier: any) => {
                          const titreObjects = getCahierTitreObjects(cahier);
                          const objectifObjects =
                            getCahierObjectifObjects(cahier);
                          const notionObjects = getCahierNotionObjects(cahier);
                          const exerciceObjects =
                            getCahierExerciceObjects(cahier);
                          const pratiqueObjects =
                            getCahierPratiqueObjects(cahier);

                          return (
                            <div
                              key={cahier.id}
                              className="space-y-1 border-t border-[#2c2c30] pt-2"
                            >
                              {titreObjects.length > 0 ? (
                                titreObjects.map((titre: any, i) => {
                                  const titreId = titre.id;
                                  const titreLabel =
                                    titre.label || String(titre);
                                  const relatedObjectifs =
                                    objectifObjects.filter(
                                      (obj: any) => obj.titreId === titreId,
                                    );
                                  const relatedNotions = notionObjects.filter(
                                    (obj: any) => obj.titreId === titreId,
                                  );
                                  const relatedExercices =
                                    exerciceObjects.filter(
                                      (obj: any) => obj.titreId === titreId,
                                    );
                                  const relatedPratiques =
                                    pratiqueObjects.filter(
                                      (obj: any) => obj.titreId === titreId,
                                    );

                                  return (
                                    <div key={titreId} className="space-y-2">
                                      <div className="rounded-lg border border-[#2c2c30] bg-[#0d0f14] p-2">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] bg-[#1b2234] text-[#22c55e] border-[#22c55e]/30"
                                        >
                                          Titre {i + 1}
                                        </Badge>
                                        <p className="text-[11px] text-[rgb(243_244_246)] break-words">
                                          {titreLabel}
                                        </p>
                                      </div>
                                      {relatedObjectifs.length > 0 && (
                                        <div className="rounded-lg border border-[#2c2c30] bg-[#0d0f14] p-2 ml-4">
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30"
                                          >
                                            Objectif
                                          </Badge>
                                          <ul className="ml-4 list-disc space-y-0.5">
                                            {relatedObjectifs.map(
                                              (obj: any) => (
                                                <li
                                                  key={obj.id}
                                                  className="text-[11px] text-[rgb(156_163_175)] break-words"
                                                >
                                                  {obj.label || String(obj)}
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                      {relatedPratiques.length > 0 && (
                                        <div className="rounded-lg border border-[#2c2c30] bg-[#0d0f14] p-2 ml-4">
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30"
                                          >
                                            Pratique suggérée
                                          </Badge>
                                          <ul className="ml-4 list-disc space-y-0.5">
                                            {relatedPratiques.map(
                                              (obj: any) => (
                                                <li
                                                  key={obj.id}
                                                  className="text-[11px] text-[rgb(156_163_175)] break-words"
                                                >
                                                  {obj.label || String(obj)}
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div>
                                  <span className="text-[10px] font-semibold text-[#22c55e] uppercase tracking-wide">
                                    Titre
                                  </span>
                                  <p className="text-[11px] text-[rgb(156_163_175)]">
                                    Aucun titre
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-4 space-y-1 border-t border-[#2c2c30] pt-3">
                      <div>
                        <span className="text-[10px] font-semibold text-[#22c55e] uppercase tracking-wide">
                          Examen 1
                        </span>
                        <p className="text-[11px] text-[rgb(156_163_175)]">
                          {trimestre.examen1 || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-[#f59e0b] uppercase tracking-wide">
                          Examen 2
                        </span>
                        <p className="text-[11px] text-[rgb(156_163_175)]">
                          {trimestre.examen2 || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {classes.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? "w-4 bg-[rgb(203_210_224)]"
                : "w-2 bg-[#2c2c30] hover:bg-[rgb(156_163_175)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default function LeconsPage() {
  const [classesData, setClassesData] = useState<UsualClasseWithTrimestres[]>(
    [],
  );
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [usualClasses, setUsualClasses] = useState<
    { id: string; libelle: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openFiches, setOpenFiches] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    search: "",
    trimestre: "",
  });

  const [editingTrimestre, setEditingTrimestre] = useState<Trimestre | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeClassTrimestresCount, setActiveClassTrimestresCount] =
    useState(0);
  const [currentClasseForPdf, setCurrentClasseForPdf] =
    useState<UsualClasseWithTrimestres | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    classeId: "",
    matiereId: "",
    numero: "",
    lecon: "",
    examen1: "",
    examen2: "",
    cahiers: [] as any[],
  });
  const [formData, setFormData] = useState({
    lecon: "",
    examen1: "",
    examen2: "",
    cahiers: [] as any[],
  });
  const { modePdf: pdfModalOpen, pdfUrl, openPdf, closePdf } = usePdfPreview();
  const [enseignantNom, setEnseignantNom] = useState("");

  const openEditModal = (trimestre: Trimestre) => {
    setEditingTrimestre(trimestre);
    setFormData({
      lecon: trimestre.lecon || "",
      examen1: trimestre.examen1 || "",
      examen2: trimestre.examen2 || "",
      cahiers: (trimestre.cahiers || []).map((c) => ({
        ...c,
        titre: typeof c.titre === "string" ? c.titre : JSON.stringify(c.titre),
        objectif:
          typeof c.objectif === "string"
            ? c.objectif
            : JSON.stringify(c.objectif),
        notion:
          typeof c.notion === "string" ? c.notion : JSON.stringify(c.notion),
        exercice:
          typeof c.exercice === "string"
            ? c.exercice
            : JSON.stringify(c.exercice),
        pratique:
          typeof c.pratique === "string"
            ? c.pratique
            : JSON.stringify(c.pratique),
      })),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingTrimestre) return;
    try {
      const res = await fetch(`/api/enseignant/lecons`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTrimestre.id,
          lecon: formData.lecon,
          examen1: formData.examen1,
          examen2: formData.examen2,
          cahiers: formData.cahiers,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Modifié avec succès");
      setIsModalOpen(false);
      fetchTrimestres();
    } catch (e) {
      toast.error("Erreur lors de la modification");
    }
  };

  const handleOpenCreateModal = () => {
    const currentClasse = classesData.find((c) =>
      c.trimestres.some((t) => t.id),
    );
    const classeId = currentClasse?.id || classesData[0]?.id || "";
    const matiereId =
      currentClasse?.trimestres[0]?.matiereId || matieres[0]?.id || "";
    setCreateForm({
      classeId,
      matiereId,
      numero: "",
      lecon: "",
      examen1: "",
      examen2: "",
      cahiers: [],
    });
    setCreateModalOpen(true);
  };

  const createCahierField = (
    cahierIndex: number,
    field: string,
    value: string,
  ) => {
    const newCahiers = [...createForm.cahiers];
    newCahiers[cahierIndex] = { ...newCahiers[cahierIndex], [field]: value };
    setCreateForm({ ...createForm, cahiers: newCahiers });
  };

  const createGetNextId = (items: any[]) => {
    let maxId = 0;
    for (let i = 0; i < items.length; i++) {
      const id = items[i].id || 0;
      if (id > maxId) maxId = id;
    }
    return maxId + 1;
  };

  const createAddTitre = (cahierIndex: number) => {
    const current = JSON.parse(createForm.cahiers[cahierIndex].titre || "[]");
    const newId = createGetNextId(current);
    current.push({ id: newId, label: "" });
    createCahierField(cahierIndex, "titre", JSON.stringify(current));
  };

  const createRemoveTitre = (cahierIndex: number, titreId: number) => {
    const newCahiers = [...createForm.cahiers];
    const cahier = { ...newCahiers[cahierIndex] };
    const titreItems = JSON.parse(cahier.titre || "[]");
    const filteredTitres = titreItems.filter(
      (item: any) => item.id !== titreId,
    );
    cahier.titre = JSON.stringify(filteredTitres);
    ["objectif", "notion", "exercice", "pratique"].forEach((field) => {
      const items = JSON.parse(cahier[field] || "[]");
      const filtered = items.filter((item: any) => item.titreId !== titreId);
      cahier[field] = JSON.stringify(filtered);
    });
    newCahiers[cahierIndex] = cahier;
    setCreateForm({ ...createForm, cahiers: newCahiers });
  };

  const createUpdateTitreLabel = (
    cahierIndex: number,
    titreId: number,
    label: string,
  ) => {
    const newCahiers = [...createForm.cahiers];
    const cahier = { ...newCahiers[cahierIndex] };
    const titreItems = JSON.parse(cahier.titre || "[]");
    const updated = titreItems.map((item: any) =>
      item.id === titreId ? { ...item, label } : item,
    );
    cahier.titre = JSON.stringify(updated);
    newCahiers[cahierIndex] = cahier;
    setCreateForm({ ...createForm, cahiers: newCahiers });
  };

  const createAddItem = (
    cahierIndex: number,
    field: string,
    titreId?: number,
  ) => {
    const current = JSON.parse(createForm.cahiers[cahierIndex][field] || "[]");
    const newId = createGetNextId(current);
    const newItem: any = { id: newId, label: "" };
    if (titreId !== undefined) newItem.titreId = titreId;
    current.push(newItem);
    createCahierField(cahierIndex, field, JSON.stringify(current));
  };

  const createRemoveItem = (
    cahierIndex: number,
    field: string,
    itemId: number,
    titreId?: number,
  ) => {
    let current = JSON.parse(createForm.cahiers[cahierIndex][field] || "[]");
    if (titreId !== undefined) {
      current = current.filter(
        (item: any) => !(item.id === itemId && item.titreId === titreId),
      );
    } else {
      current = current.filter((item: any) => item.id !== itemId);
    }
    createCahierField(cahierIndex, field, JSON.stringify(current));
  };

  const handleCreateTrimestre = async () => {
    if (!createForm.classeId || !createForm.matiereId || !createForm.numero) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    try {
      const res = await fetch(`/api/enseignant/lecons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          cahiers: createForm.cahiers,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Trimestre créé");
      setCreateModalOpen(false);
      fetchTrimestres();
    } catch (e) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleDeleteTrimestre = async (trimestre: Trimestre) => {
    const confirmed = await showConfirmToast({
      title: `Supprimer le ${trimestre.numero === 1 ? "1er" : `${trimestre.numero}e`} Trimestre ?`,
      description:
        "Cette action supprimera également tous les cahiers associés.",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/enseignant/lecons?id=${trimestre.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Trimestre supprimé");
        fetchTrimestres();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    }
  };

  const isFormValid = () => {
    if (!formData.lecon.trim()) return false;
    if (!formData.examen1.trim()) return false;
    if (!formData.examen2.trim()) return false;

    for (const cahier of formData.cahiers) {
      const titreItems = parseJsonObjects(cahier.titre);
      const objectifItems = parseJsonObjects(cahier.objectif);
      const notionItems = parseJsonObjects(cahier.notion);
      const exerciceItems = parseJsonObjects(cahier.exercice);
      const pratiqueItems = parseJsonObjects(cahier.pratique);

      for (const item of titreItems) {
        if (!item.label || !item.label.trim()) return false;
      }
      for (const item of objectifItems) {
        if (!item.label || !item.label.trim()) return false;
      }
      for (const item of notionItems) {
        if (!item.label || !item.label.trim()) return false;
      }
      for (const item of exerciceItems) {
        if (!item.label || !item.label.trim()) return false;
      }
      for (const item of pratiqueItems) {
        if (!item.label || !item.label.trim()) return false;
      }
    }

    return true;
  };

  const parseJsonObjects = (value: string | any[] | undefined): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const updateCahierField = (
    cahierIndex: number,
    field: string,
    items: any[],
  ) => {
    const currentItems = parseJsonObjects(formData.cahiers[cahierIndex][field]);
    const incomingIds = new Set(items.map((i: any) => i.id));
    const preservedItems = currentItems.filter(
      (item: any) => !incomingIds.has(item.id),
    );
    const mergedItems = [...preservedItems, ...items];
    const newCahiers = [...formData.cahiers];
    newCahiers[cahierIndex] = {
      ...newCahiers[cahierIndex],
      [field]: JSON.stringify(mergedItems),
    };
    setFormData({ ...formData, cahiers: newCahiers });
  };

  const getNextId = (items: any[]) => {
    let maxId = 0;
    for (let i = 0; i < items.length; i++) {
      const id = items[i].id || 0;
      if (id > maxId) maxId = id;
    }
    return maxId + 1;
  };

  const addItem = (cahierIndex: number, field: string, titreId?: number) => {
    const current = parseJsonObjects(formData.cahiers[cahierIndex][field]);
    const newId = getNextId(current);
    const newItem: any = { id: newId, label: "" };
    if (titreId !== undefined) {
      newItem.titreId = titreId;
    }
    current.push(newItem);
    updateCahierField(cahierIndex, field, current);
  };

  const removeItem = (
    cahierIndex: number,
    field: string,
    itemId: number,
    titreId?: number,
  ) => {
    let current = parseJsonObjects(formData.cahiers[cahierIndex][field]);
    if (titreId !== undefined) {
      current = current.filter(
        (item: any) => !(item.id === itemId && item.titreId === titreId),
      );
    } else {
      current = current.filter((item: any) => item.id !== itemId);
    }
    updateCahierField(cahierIndex, field, current);
  };

  const addTitre = (cahierIndex: number) => {
    const current = parseJsonObjects(formData.cahiers[cahierIndex].titre);
    const newId = getNextId(current);
    current.push({ id: newId, label: "" });
    updateCahierField(cahierIndex, "titre", current);
  };

  const removeTitre = (cahierIndex: number, titreId: number) => {
    const newCahiers = [...formData.cahiers];
    const cahier = { ...newCahiers[cahierIndex] };

    const titreItems = parseJsonObjects(cahier.titre);
    const filteredTitres = titreItems.filter(
      (item: any) => item.id !== titreId,
    );
    cahier.titre = JSON.stringify(filteredTitres);

    ["objectif", "notion", "exercice", "pratique"].forEach((field) => {
      const items = parseJsonObjects(cahier[field]);
      const filtered = items.filter((item: any) => item.titreId !== titreId);
      cahier[field] = JSON.stringify(filtered);
    });

    newCahiers[cahierIndex] = cahier;
    setFormData({ ...formData, cahiers: newCahiers });
  };

  const updateTitreLabel = (
    cahierIndex: number,
    titreId: number,
    label: string,
  ) => {
    const current = parseJsonObjects(formData.cahiers[cahierIndex].titre);
    const updated = current.map((item: any) =>
      item.id === titreId ? { ...item, label } : item,
    );
    updateCahierField(cahierIndex, "titre", updated);
  };

  const fetchTrimestres = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.trimestre) params.set("trimestre", filters.trimestre);

      const res = await fetch(`/api/enseignant/lecons?${params.toString()}`);
      const data = await res.json();
      setClassesData(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const fetchRefs = async () => {
    try {
      const res = await fetch("/api/enseignant/lecons/refs");
      if (!res.ok) {
        throw new Error("Failed to load refs: " + res.status);
      }
      const data = await res.json();
      setMatieres(data.matieres || []);
      setUsualClasses(data.usualClasses || []);
    } catch (e) {
      console.error("Failed to load refs", e);
    }
  };

  useEffect(() => {
    fetchTrimestres();
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

  const handleFilterChange = (name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.search) params.set("search", newFilters.search);
    if (newFilters.trimestre) params.set("trimestre", newFilters.trimestre);

    fetch(`/api/enseignant/lecons?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setClassesData(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error("Fetch trimestres failed:", e);
        toast.error("Erreur de chargement");
      });
  };

  const handleExportPdf = async (classe: UsualClasseWithTrimestres) => {
    if (!classe) {
      toast.error("Aucune classe sélectionnée");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");

      await addSchoolPdfHeader(doc, {
        title: `LISTE DES LECONS - ${classe.label || "Sans classe"}`,
        countLabel: `${classe.trimestres.length} TRIMESTRES`,
      });

      doc.setFontSize(10);
      doc.text(`Enseignant : ${enseignantNom || "-"}`, 14, 32);

      const rows: string[][] = [];

      const sortedTrimestres = [...classe.trimestres].sort(
        (a, b) => a.numero - b.numero,
      );

      for (const trimestre of sortedTrimestres) {
        const trimestreLabel = `${
          trimestre.numero === 1 ? "1er" : `${trimestre.numero}e`
        } Trimestre`;
        const cahiers = parseJsonObjects(trimestre.cahiers);

        if (cahiers.length === 0) continue;

        rows.push([`${trimestreLabel} - ${trimestre.lecon || ""}`, ""]);

        for (const cahier of cahiers) {
          const titres = parseJsonObjects(cahier.titre);
          const objectifs = parseJsonObjects(cahier.objectif);
          const notions = parseJsonObjects(cahier.notion);
          const exercices = parseJsonObjects(cahier.exercice);
          const pratiques = parseJsonObjects(cahier.pratique);

          const titreText =
            titres
              .map((t: any) => (t.label || "").trim())
              .filter(Boolean)
              .join("\n") || "-";

          const objectifText = objectifs
            .map((o: any) => (o.label || "").trim())
            .filter(Boolean)
            .join(", ");

          const notionText = notions
            .map((n: any) => (n.label || "").trim())
            .filter(Boolean)
            .join(", ");

          const exerciceText = exercices
            .map((e: any) => (e.label || "").trim())
            .filter(Boolean)
            .join(", ");

          const pratiqueText = pratiques
            .map((p: any) => (p.label || "").trim())
            .filter(Boolean)
            .join(", ");

          const detailsParts: string[] = [
            objectifText ? `Objectif: ${objectifText}` : null,
            notionText ? `Notions: ${notionText}` : null,
            exerciceText ? `Exercices: ${exerciceText}` : null,
            pratiqueText ? `Pratique: ${pratiqueText}` : null,
          ].filter((item): item is string => item !== null);

          if (detailsParts.length === 0) {
            rows.push([titreText, "-"]);
          } else {
            rows.push([titreText, detailsParts[0]]);
            for (let i = 1; i < detailsParts.length; i++) {
              rows.push(["", detailsParts[i]]);
            }
          }
        }
      }

      if (rows.length === 0) {
        toast.error("Aucune donnée à exporter pour cette classe");
        return;
      }

      autoTable(doc, {
        startY: 36,
        head: [["Titre / Trimestre", "Détails"]],
        body: rows,
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
          0: { cellWidth: 70 },
          1: { cellWidth: 112 },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Lecons");

      openPdf(doc);
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const toggleFiche = (key: string) => {
    setOpenFiches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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
            value={filters.trimestre}
            onValueChange={(v) => handleFilterChange("trimestre", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous trimestres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous trimestres</SelectItem>
              <SelectItem value="1">Trimestre 1</SelectItem>
              <SelectItem value="2">Trimestre 2</SelectItem>
              <SelectItem value="3">Trimestre 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ExportPdfButton
          onClick={() => {
            const target = currentClasseForPdf || classesData[0];
            if (target) handleExportPdf(target);
          }}
        >
          <FileText className="h-4 w-4" />
          PDF
        </ExportPdfButton>
        <Button
          variant="default"
          size="default"
          disabled={activeClassTrimestresCount >= 3}
          onClick={() => handleOpenCreateModal()}
          className="gap-2 justify-start w-[9rem]"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 overflow-hidden p-0">
          {loading ? (
            <div className="flex h-[68vh] items-center justify-center text-center text-sm text-[rgb(156_163_175)]">
              Chargement...
            </div>
          ) : classesData.length === 0 ? (
            <div className="flex h-[68vh] items-center justify-center text-center text-sm text-[rgb(156_163_175)]">
              Aucune classe trouvée
            </div>
          ) : (
            <ClasseCarousel
              classes={classesData}
              openFiches={openFiches}
              onToggleFiche={toggleFiche}
              onEditTrimestre={openEditModal}
              onDeleteTrimestre={handleDeleteTrimestre}
              onActiveClassChange={setActiveClassTrimestresCount}
              onCurrentClasseChange={setCurrentClasseForPdf}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[54rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau trimestre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[rgb(156_163_175)]">Classe</label>
              <Select
                value={createForm.classeId}
                onValueChange={(v) =>
                  setCreateForm({ ...createForm, classeId: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner classe" />
                </SelectTrigger>
                <SelectContent>
                  {usualClasses.map((uc) => (
                    <SelectItem key={uc.id} value={uc.id}>
                      {uc.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[rgb(156_163_175)]">Numéro</label>
              <Select
                value={createForm.numero}
                onValueChange={(v) =>
                  setCreateForm({ ...createForm, numero: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Numéro" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 1 ? "1er" : `${n}e`} Trimestre
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[rgb(156_163_175)]">Leçon</label>
              <Input
                value={createForm.lecon}
                onChange={(e) =>
                  setCreateForm({ ...createForm, lecon: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-[rgb(156_163_175)]">
                Examen 1
              </label>
              <Input
                value={createForm.examen1}
                onChange={(e) =>
                  setCreateForm({ ...createForm, examen1: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-[rgb(156_163_175)]">
                Examen 2
              </label>
              <Input
                value={createForm.examen2}
                onChange={(e) =>
                  setCreateForm({ ...createForm, examen2: e.target.value })
                }
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[rgb(243_244_246)]">
                Cahiers
              </h4>
              {createForm.cahiers.length === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCreateForm({
                      ...createForm,
                      cahiers: [
                        {
                          id: Date.now(),
                          titre: "[]",
                          objectif: "[]",
                          notion: "[]",
                          exercice: "[]",
                          pratique: "[]",
                        },
                      ],
                    })
                  }
                  className="w-full text-[10px] h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter un cahier
                </Button>
              )}
              {createForm.cahiers.map((cahier, index) => {
                const titreItems = parseJsonObjects(cahier.titre);
                const objectifItems = parseJsonObjects(cahier.objectif);
                const notionItems = parseJsonObjects(cahier.notion);
                const exerciceItems = parseJsonObjects(cahier.exercice);
                const pratiqueItems = parseJsonObjects(cahier.pratique);

                return (
                  <div
                    key={cahier.id}
                    className="space-y-3 rounded-lg border border-[#2c2c30] bg-[#0d0f14] p-3"
                  >
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newCahiers = createForm.cahiers.filter(
                            (_, i) => i !== index,
                          );
                          setCreateForm({ ...createForm, cahiers: newCahiers });
                        }}
                        className="text-[#ef4444] hover:text-[#ef4444] text-[10px] h-7 px-2"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Supprimer le cahier
                      </Button>
                    </div>
                    {titreItems.map((titre: any) => (
                      <TitreBlock
                        key={titre.id}
                        titre={titre}
                        objectifs={objectifItems.filter(
                          (obj: any) => obj.titreId === titre.id,
                        )}
                        notions={notionItems.filter(
                          (obj: any) => obj.titreId === titre.id,
                        )}
                        exercices={exerciceItems.filter(
                          (obj: any) => obj.titreId === titre.id,
                        )}
                        pratiques={pratiqueItems.filter(
                          (obj: any) => obj.titreId === titre.id,
                        )}
                        onUpdateTitreLabel={(label) =>
                          createUpdateTitreLabel(index, titre.id, label)
                        }
                        onUpdateItems={(field, items) =>
                          createCahierField(index, field, JSON.stringify(items))
                        }
                        onAddItem={(field) =>
                          createAddItem(index, field, titre.id)
                        }
                        onRemoveItem={(field, id) =>
                          createRemoveItem(index, field, id, titre.id)
                        }
                        onRemoveTitre={() => createRemoveTitre(index, titre.id)}
                      />
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => createAddTitre(index)}
                      className="w-full text-[10px] h-7"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter un titre
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreateTrimestre}
                disabled={!createForm.numero}
              >
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[54rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le trimestre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[rgb(156_163_175)]">Leçon</label>
              <Input
                value={formData.lecon}
                onChange={(e) =>
                  setFormData({ ...formData, lecon: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-[rgb(156_163_175)]">
                Examen 1
              </label>
              <Input
                value={formData.examen1}
                onChange={(e) =>
                  setFormData({ ...formData, examen1: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-[rgb(156_163_175)]">
                Examen 2
              </label>
              <Input
                value={formData.examen2}
                onChange={(e) =>
                  setFormData({ ...formData, examen2: e.target.value })
                }
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[rgb(243_244_246)]">
                Cahiers
              </h4>
              {formData.cahiers.map((cahier, index) => {
                const titreItems = parseJsonObjects(cahier.titre);
                const objectifItems = parseJsonObjects(cahier.objectif);
                const notionItems = parseJsonObjects(cahier.notion);
                const exerciceItems = parseJsonObjects(cahier.exercice);
                const pratiqueItems = parseJsonObjects(cahier.pratique);

                return (
                  <div
                    key={cahier.id}
                    className="space-y-3 rounded-lg border border-[#2c2c30] bg-[#0d0f14] p-3"
                  >
                    {titreItems.map((titre: any) => (
                      <TitreBlock
                        key={titre.id}
                        titre={titre}
                        objectifs={objectifItems.filter(
                          (obj: any) => obj.titreId === titre.id,
                        )}
                        notions={notionItems.filter(
                          (obj: any) => obj.titreId === titre.id,
                        )}
                        exercices={exerciceItems.filter(
                          (obj: any) => obj.titreId === titre.id,
                        )}
                        pratiques={pratiqueItems.filter(
                          (obj: any) => obj.titreId === titre.id,
                        )}
                        onUpdateTitreLabel={(label) =>
                          updateTitreLabel(index, titre.id, label)
                        }
                        onUpdateItems={(field, items) =>
                          updateCahierField(index, field, items)
                        }
                        onAddItem={(field) => addItem(index, field, titre.id)}
                        onRemoveItem={(field, id) =>
                          removeItem(index, field, id, titre.id)
                        }
                        onRemoveTitre={() => removeTitre(index, titre.id)}
                      />
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addTitre(index)}
                      className="w-full text-[10px] h-7"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter un titre
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={!isFormValid()}>
                Enregistrer
              </Button>
            </div>
          </div>
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
                title="Prévisualisation des leçons"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
