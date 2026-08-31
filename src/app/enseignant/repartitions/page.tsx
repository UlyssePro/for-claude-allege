"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getClasseColor } from "@/lib/badge-colors";
import {
  convertDateToFr,
  convertDayToLetter,
  ListMonth,
} from "@/lib/fpj.utils";
import { Card } from "@/components/ui/card";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { ImportEdtButton } from "@/components/ui/import-edt-button";

const SLOTS = [
  "06h45 - 07h45",
  "07h45 - 08h45",
  "08h45 - 09h45",
  "09h45 - 10h00",
  "10h00 - 11h00",
  "11h00 - 12h00",
  "14h30 - 15h30",
  "15h30 - 16h30",
  "16h30 - 17h30",
];

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const HORAIRE_ID_BY_POSITION: Record<number, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "0",
  5: "4",
  6: "5",
  7: "6",
  8: "7",
  9: "8",
};

function getHoraireIdForPosition(
  position: number,
  horaires: HoraireRef[],
): string | null {
  const idx = position - 1;
  if (idx >= 0 && idx < horaires.length) {
    return horaires[idx].id || null;
  }
  return HORAIRE_ID_BY_POSITION[position] ?? null;
}

function getHoraireLabelForPosition(
  position: number,
  horaires: HoraireRef[],
): string {
  const idx = position - 1;
  if (idx >= 0 && idx < horaires.length) {
    return horaires[idx].hour || "-";
  }
  const mappedId = HORAIRE_ID_BY_POSITION[position];
  const mapped = horaires.find((h) => h.id === mappedId);
  return mapped?.hour || "-";
}

const SCHOOL_YEAR_START = new Date(2025, 8, 1);
const SCHOOL_YEAR_END = new Date(2026, 7, 31);

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  for (let i = 0; i < 6; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getSchoolYearLabel(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 8) {
    return `${String(year).slice(2)}-${String(year + 1).slice(2)}`;
  }
  return `${String(year - 1).slice(2)}-${String(year).slice(2)}`;
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateFr(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const parseJsonField = (value: string | any[] | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map((item: any) => item?.label || String(item));
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item: any) => item?.label || String(item))
      : [String(parsed)];
  } catch {
    return [String(value)];
  }
};

const parseJsonObjects = (value: string | any[] | undefined): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") {
      try {
        const secondParsed = JSON.parse(parsed);
        return Array.isArray(secondParsed) ? secondParsed : [];
      } catch {
        return [];
      }
    }
    return [];
  } catch {
    return [];
  }
};

const getCahierTitres = (cahier: any): any[] => parseJsonObjects(cahier.titre);
const getCahierObjectifs = (cahier: any): any[] =>
  parseJsonObjects(cahier.objectif);
const getCahierNotions = (cahier: any): any[] =>
  parseJsonObjects(cahier.notion);
const getCahierExercices = (cahier: any): any[] =>
  parseJsonObjects(cahier.exercice);
const getCahierPratiques = (cahier: any): any[] =>
  parseJsonObjects(cahier.pratique);

const getFilteredCahierItems = (
  cahiers: any[],
  trimestreId: string,
  field: string,
  titreId?: string,
): any[] => {
  const fieldMap: Record<string, (c: any) => any[]> = {
    titre: getCahierTitres,
    objectif: getCahierObjectifs,
    notion: getCahierNotions,
    exercice: getCahierExercices,
    pratique: getCahierPratiques,
  };
  const extractor = fieldMap[field];
  if (!extractor) return [];
  const items: any[] = [];
  for (const cahier of cahiers) {
    if (cahier.trimestreId === trimestreId) {
      const extracted = extractor(cahier);
      if (titreId !== undefined && titreId !== "") {
        items.push(
          ...extracted.filter((item: any) => String(item.titreId) === titreId),
        );
      } else {
        items.push(...extracted);
      }
    }
  }
  return items;
};

interface ClasseRef {
  id: string;
  label: string;
  lieuId: string | null;
  taux: string | null;
}

interface HoraireRef {
  id: string;
  hour: string;
}

interface MatiereRef {
  label: string;
}

interface RepartitionEntry {
  id?: string;
  position: number;
  date: string | null;
  classeId: string | null;
  classeLabel?: string | null;
  horaireId: string | null;
  horaireLabel?: string | null;
  lieuId: string | null;
  lieuLabel?: string | null;
  matiereLabel?: string | null;
  statut?: string | null;
  taux?: string | null;
  task?: string | null;
  trimestreId?: string | null;
  titreId?: string | null;
  objectifId?: string | null;
  notionId?: string | null;
  exerciceId?: string | null;
  pratiqueId?: string | null;
  other?: string | null;
}

interface SlotForm {
  id?: string;
  position: number;
  classeId: string;
  lieuId: string;
  taux: string;
  task: string;
}

export default function RepartitionsCalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [classes, setClasses] = useState<ClasseRef[]>([]);
  const [horaires, setHoraires] = useState<HoraireRef[]>([]);
  const [repartitions, setRepartitions] = useState<RepartitionEntry[]>([]);
  const repartitionsRef = useRef(repartitions);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{
    date: string;
    position: number;
  } | null>(null);
  const [editingEntry, setEditingEntry] = useState<RepartitionEntry | null>(
    null,
  );
  const [formClasseId, setFormClasseId] = useState("");
  const [formTrimestreId, setFormTrimestreId] = useState("");
  const [formTitreId, setFormTitreId] = useState("");
  const [formObjectifId, setFormObjectifId] = useState("");
  const [formPratiqueId, setFormPratiqueId] = useState("");
  const [formOtherId, setFormOtherId] = useState("");
  const [importingEdt, setImportingEdt] = useState(false);
  const [refsLoaded, setRefsLoaded] = useState(false);
  const [edtEntries, setEdtEntries] = useState<
    Array<{
      id?: string;
      position: number;
      date: string | null;
      annee: string | null;
      classeId: string | null;
      lieuId: string | null;
      horaireId: string | null;
    }>
  >([]);
  const [enseignantId, setEnseignantId] = useState<string | null>(null);
  const [enseignantMatiereId, setEnseignantMatiereId] = useState<string | null>(
    null,
  );
  const [fpjModalOpen, setFpjModalOpen] = useState(false);
  const [fpjPdfUrl, setFpjPdfUrl] = useState<string | null>(null);
  const [trimestres, setTrimestres] = useState<any[]>([]);
  const [cahiers, setCahiers] = useState<any[]>([]);

  const weekDates = useMemo(
    () => getWeekDates(currentWeekStart),
    [currentWeekStart],
  );

  const hasWeekRepartitions = useMemo(() => {
    const weekDateKeys = new Set(weekDates.map(formatDateLocal));
    return repartitions.some((r) => r.date && weekDateKeys.has(r.date));
  }, [repartitions, weekDates]);

  const loadRefs = async () => {
    if (refsLoaded) return;
    try {
      const res = await fetch("/api/enseignant/grilles/refs");
      if (res.ok) {
        const refs = await res.json();
        setClasses(refs.classes || []);
        setHoraires(refs.horaires || []);
        setRefsLoaded(true);
      }
    } catch {
      toast.error("Erreur lors du chargement des références");
    }
  };

  const loadRepartitionRefs = async (currentEnseignantId?: string | null) => {
    try {
      const params = new URLSearchParams();
      if (currentEnseignantId) {
        params.set("enseignantId", currentEnseignantId);
      }
      const res = await fetch(`/api/enseignant/repartitions/refs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        console.log("loadRepartitionRefs data:", data);
        setClasses(data.classes || []);
        setTrimestres(data.trimestres || []);
        setCahiers(data.cahiers || []);
      } else {
        console.error("loadRepartitionRefs failed:", res.status);
      }
    } catch (e) {
      console.error("loadRepartitionRefs error:", e);
      toast.error("Erreur lors du chargement des références de répartition");
    }
  };

  const loadEdtEntries = async () => {
    try {
      const res = await fetch("/api/enseignant/emploi-du-temps");
      if (res.ok) {
        const data = await res.json();
        setEdtEntries(data || []);
      }
    } catch {
      // silently ignore EDT load errors
    }
  };

  useEffect(() => {
    loadRefs();
    loadEdtEntries();
    fetch("/api/enseignant/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.enseignant?.id) {
          setEnseignantId(data.enseignant.id);
          setEnseignantMatiereId(data.enseignant.matiere?.id || null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enseignantId) {
      loadRepartitionRefs(enseignantId);
    }
  }, [enseignantId]);

  useEffect(() => {
    if (editingEntry && classes.length === 0 && enseignantId) {
      loadRepartitionRefs(enseignantId);
    }
  }, [editingEntry, classes.length, enseignantId]);

  useEffect(() => {
    repartitionsRef.current = repartitions;
  }, [repartitions]);

  const getSlotLabel = (position: number) => {
    const idx = position - 1;
    if (idx >= 0 && idx < SLOTS.length) {
      return SLOTS[idx];
    }
    if (idx >= 0 && idx < horaires.length) {
      return horaires[idx].hour;
    }
    return "";
  };

  const currentAnnee = getSchoolYearLabel(currentWeekStart);

  const monthStart = useMemo(() => {
    const d = new Date(currentWeekStart);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [currentWeekStart]);

  const monthEnd = useMemo(() => {
    const d = new Date(currentWeekStart);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }, [currentWeekStart]);

  const [allMonthRepartitions, setAllMonthRepartitions] = useState<
    RepartitionEntry[]
  >([]);

  const fetchWeekRepartitions = async () => {
    setLoadingWeek(true);
    try {
      const dateFrom = formatDateLocal(weekDates[0]);
      const dateTo = formatDateLocal(weekDates[5]);
      const res = await fetch(
        `/api/enseignant/repartitions?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      );
      if (res.ok) {
        const data = await res.json();

        const mapped: RepartitionEntry[] = data.map((r: any) => ({
          id: r.id,
          position: r.position,
          date: r.date ? formatDateLocal(new Date(r.date)) : null,
          classeId: r.classeId,
          classeLabel: r.classe?.label || null,
          horaireId: r.hourId,
          horaireLabel: r.horaire?.hour || null,
          lieuId: r.lieuId,
          lieuLabel: r.lieuEcole?.label || null,
          matiereLabel: r.matiere?.label || null,
          statut: r.statut,
          taux: r.taux,
          task: r.task,
          trimestreId: r.trimestreId,
          titreId: r.titreId,
          objectifId: r.objectifId,
          notionId: r.notionId,
          exerciceId: r.exerciceId,
          pratiqueId: r.pratiqueId,
          other: r.other,
        }));

        setAllMonthRepartitions(mapped);
        setRepartitions(mapped);
        buildSlotsFromRepartitions(mapped);
      }
    } catch {
      // silently ignore errors
    } finally {
      setLoadingWeek(false);
    }
  };
  const buildSlotsFromRepartitions = (items: RepartitionEntry[]) => {
    const map = new Map<number, RepartitionEntry>();
    for (const item of items) {
      if (item.position) {
        map.set(item.position, item);
      }
    }
  };

  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const openAddDialog = (date: string, position: number) => {
    const existing = repartitions.find(
      (r) => r.date === date && r.position === position,
    );
    setEditingSlot({ date, position });
    setEditingEntry(existing || null);
    setFormClasseId(existing?.classeId || "");
    setFormTrimestreId(existing?.trimestreId || "");
    setFormTitreId(existing?.titreId ? String(existing.titreId) : "");
    setFormObjectifId(existing?.objectifId ? String(existing.objectifId) : "");
    setFormPratiqueId(existing?.pratiqueId ? String(existing.pratiqueId) : "");
    setFormOtherId(existing?.other || "");
  };

  const closeDialog = () => {
    setEditingSlot(null);
    setEditingEntry(null);
    setFormClasseId("");
    setFormTrimestreId("");
    setFormTitreId("");
    setFormObjectifId("");
    setFormPratiqueId("");
    setFormOtherId("");
  };

  const handleSaveSlot = async () => {
    if (!editingSlot) return;

    const classeId = formClasseId || editingEntry?.classeId || null;
    const classe = classes.find((c) => c.id === classeId) || null;

    const entry = {
      id: editingEntry?.id,
      position: editingSlot.position,
      date: editingSlot.date,
      classeId: classeId,
      lieuId: classe?.lieuId || null,
      taux: classe?.taux || null,
      horaireId: getHoraireIdForPosition(editingSlot.position, horaires),
      matiereId: enseignantMatiereId,
      statut: "NON_FAIT",
      trimestreId: formTrimestreId || null,
      titreId: formTitreId ? String(formTitreId) : null,
      objectifId: formObjectifId ? String(formObjectifId) : null,
      pratiqueId: formPratiqueId ? String(formPratiqueId) : null,
      other: formOtherId || null,
    };

    setRepartitions((prev) => {
      const exists = prev.find(
        (r) =>
          r.date === editingSlot.date && r.position === editingSlot.position,
      );
      const horaire = horaires.find(
        (h) => h.id === getHoraireIdForPosition(editingSlot.position, horaires),
      );
      if (exists) {
        return prev.map((r) =>
          r.date === editingSlot.date && r.position === editingSlot.position
            ? {
                ...r,
                classeId: classeId || r.classeId,
                classeLabel: classe?.label || r.classeLabel,
                horaireId: getHoraireIdForPosition(
                  editingSlot.position,
                  horaires,
                ),
                horaireLabel: horaire?.hour || null,
                lieuId: classe?.lieuId || r.lieuId,
                taux: classe?.taux || r.taux,
                statut: "NON_FAIT",
                trimestreId: formTrimestreId || null,
                titreId: formTitreId ? String(formTitreId) : null,
                objectifId: formObjectifId ? String(formObjectifId) : null,
                pratiqueId: formPratiqueId ? String(formPratiqueId) : null,
                other: formOtherId || null,
              }
            : r,
        );
      }
      return [
        ...prev,
        {
          id: undefined,
          date: editingSlot.date,
          position: editingSlot.position,
          horaireId: getHoraireIdForPosition(editingSlot.position, horaires),
          classeId: classeId,
          classeLabel: classe?.label || null,
          horaireLabel: horaire?.hour || null,
          lieuId: classe?.lieuId || null,
          taux: classe?.taux || null,
          statut: "NON_FAIT",
          trimestreId: formTrimestreId || null,
          titreId: formTitreId ? String(formTitreId) : null,
          objectifId: formObjectifId ? String(formObjectifId) : null,
          pratiqueId: formPratiqueId ? String(formPratiqueId) : null,
          other: formOtherId || null,
        },
      ];
    });

    try {
      const res = await fetch("/api/enseignant/repartitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          setRepartitions((prev) =>
            prev.map((r) =>
              r.date === editingSlot.date && r.position === editingSlot.position
                ? { ...r, id: data.id }
                : r,
            ),
          );
        }
        toast.success("Enregistrement réussi");
      } else {
        toast.error("Erreur lors de l'enregistrement");
        await fetchWeekRepartitions();
      }
    } catch {
      toast.error("Erreur réseau");
      await fetchWeekRepartitions();
    }

    closeDialog();
  };

  const handleClearSlot = async (date: string, position: number) => {
    const entry = repartitions.find(
      (r) => r.date === date && r.position === position,
    );

    setRepartitions((prev) =>
      prev.filter((r) => !(r.date === date && r.position === position)),
    );

    if (!entry?.id) return;

    try {
      const res = await fetch(`/api/enseignant/repartitions?id=${entry.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        setRepartitions((prev) => [...prev, entry]);
      }
    } catch {
      toast.error("Erreur réseau");
      setRepartitions((prev) => [...prev, entry]);
    }
  };

  const handleImportEdt = async () => {
    setImportingEdt(true);
    try {
      const startDate = formatDateLocal(weekDates[0]);
      const endDate = formatDateLocal(weekDates[5]);
      console.log("Import EDT:", {
        startDate,
        endDate,
        weekDates: weekDates.map((d) => formatDateLocal(d)),
      });

      const res = await fetch("/api/enseignant/repartitions/import-edt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Import EDT success:", data);
        const parts = [
          `${data.imported} créneau(x) ajouté(s)`,
          `${data.updated} créneau(x) mis à jour`,
          `${data.skipped} doublon(s) ignoré(s)`,
        ].filter(Boolean);
        toast.success(`EDT importé : ${parts.join(", ")}`);
        await fetchWeekRepartitions();
      } else {
        const error = await res.json();
        console.error("Import EDT error:", error);
        toast.error(error.error || "Erreur lors de l'import EDT");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setImportingEdt(false);
    }
  };

  const handleMajStatut = async (id: string | undefined) => {
    if (!id) return;

    setRepartitions((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, statut: r.statut === "NON_FAIT" ? "FAIT" : "NON_FAIT" }
          : r,
      ),
    );

    try {
      const entry = repartitionsRef.current.find((r) => r.id === id);
      const newStatut = entry?.statut === "NON_FAIT" ? "FAIT" : "NON_FAIT";
      const res = await fetch(`/api/enseignant/repartitions?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatut }),
      });

      if (!res.ok) {
        toast.error("Erreur lors de la mise à jour du statut");
        setRepartitions((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, statut: r.statut === "NON_FAIT" ? "FAIT" : "NON_FAIT" }
              : r,
          ),
        );
      }
    } catch {
      toast.error("Erreur réseau");
      setRepartitions((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, statut: r.statut === "NON_FAIT" ? "FAIT" : "NON_FAIT" }
            : r,
        ),
      );
    }
  };

  const handleExportFpj = async () => {
    try {
      const d = new Date();
      const month = String(d.getMonth() + 1);
      const annee = `${String(d.getFullYear()).slice(2)}-${String(d.getFullYear() + 1).slice(2)}`;
      const params = new URLSearchParams();
      params.set("month", month);
      params.set("annee", annee);
      params.set("format", "json");
      if (enseignantMatiereId) params.set("matiereId", enseignantMatiereId);

      const res = await fetch(
        `/api/enseignant/repartitions/export-fpj?${params.toString()}`,
        {
          credentials: "same-origin",
        },
      );
      if (!res.ok) throw new Error("Erreur lors de la génération du FPJ");
      const data = await res.json();
      const exportRepartitions = data.repartitions || [];
      if (!exportRepartitions.length) {
        const sample = data.repartitions
          ?.slice(0, 3)
          .map((r: any) => r.date)
          .filter(Boolean);
        toast.info(
          `Aucune donnée à exporter pour le mois sélectionné\n` +
            `Paramètres: ${month}/${annee}${enseignantMatiereId ? ` matiereId=${enseignantMatiereId}` : ""}\n` +
            `Résultat API: 0 ligne(s)\n` +
            `Dates existantes: ${sample?.join(", ") || "aucune"}`,
        );
        console.warn("FPJ empty result", {
          month,
          annee,
          matiereId: enseignantMatiereId,
          data,
        });
        return;
      }

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");
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
      doc.text("COLLEGE PRIVE", 36, 11);
      doc.text("HOUSSEN MEMORIAL SCHOOL", 36, 15);
      doc.text("B.P 284 - TEL 034 77 401 49", 36, 19);

      const enseignant = data.enseignant || {};
      const matiereLabel =
        data.matiere?.label || exportRepartitions[0]?.matiere?.label;

      const horaires = data.horaires || [];
      const horaireByHourId = new Map(horaires.map((h: any) => [h.id, h.hour]));

      const sorted = [...exportRepartitions].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return (a.position || 0) - (b.position || 0);
      });

      const totalHours = sorted.length;

      const groupMap = new Map<string, any[]>();
      for (const r of sorted) {
        if (!r.date) continue;
        const d = new Date(r.date);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const groupKey = `${dateKey}|${r.classeId || ""}|${r.matiereId || ""}|${r.lieuId || ""}`;
        if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
        groupMap.get(groupKey)!.push(r);
      }

      const sortedGroupKeys = Array.from(groupMap.keys()).sort();

      const body: any[] = [];
      for (const groupKey of sortedGroupKeys) {
        const rows = groupMap.get(groupKey) || [];
        const firstRow = rows[0];
        const d = new Date(firstRow.date);
        const dayLabel = convertDayToLetter(d.getDay());
        const dateLabel = convertDateToFr(d);
        const classeLabel = firstRow.classe?.label || "-";

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const horaire =
            r.horaire?.hour ||
            horaireByHourId.get(r.hourId) ||
            SLOTS[(r.position || 1) - 1] ||
            "-";

          if (i === 0) {
            body.push([dayLabel, dateLabel, horaire, classeLabel, "1H", ""]);
          } else {
            body.push(["", "", horaire, "", "1H", ""]);
          }
        }
      }

      const enseignantNom = [enseignant?.prenom, enseignant?.nom]
        .filter(Boolean)
        .join(" ");

      const signaturePrenom = (enseignant?.prenom || "").trim();
      let signatureDataUrl: string | null = null;
      if (signaturePrenom) {
        try {
          const sigRes = await fetch(
            `/uploads/signatures/Signat-${enseignantNom}.png`,
            // `/uploads/signatures/Signat-${encodeURIComponent(signaturePrenom)}.png`,
          );
          if (sigRes.ok) {
            const blob = await sigRes.blob();
            signatureDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          signatureDataUrl = null;
        }
      }

      const dateFrom = data.dateFrom ? new Date(data.dateFrom) : new Date();
      const monthId = String(dateFrom.getMonth() + 1);
      const moisLabel =
        ListMonth.find((m) => m.id === monthId)?.label ||
        dateFrom.toLocaleDateString("fr-FR", { month: "long" });

      doc.setFontSize(12);
      doc.text(
        "FICHE DE PRESENCE JOURNALIERE DES FORMATEURS VACATAIRES",
        pageWidth / 2,
        25,
        { align: "center" },
      );
      doc.setDrawColor(0, 0, 0);
      doc.line(34, 26, pageWidth - 33, 26);

      doc.setFontSize(10);
      doc.text(
        `MOIS DE : ${moisLabel} / ${dateFrom.getFullYear()} - ${dateFrom.getFullYear() + 1}`,
        14,
        33,
      );

      if (enseignantNom) {
        doc.text(`ENSEIGNANT : ${enseignantNom}`, 14, 37);
      }

      if (matiereLabel) {
        doc.text(`MATIERE : ${matiereLabel}`, 14, 41);
      }

      const tableStartY = matiereLabel ? 45 : enseignantNom ? 58 : 45;

      autoTable(doc, {
        head: [
          ["JOURS", "DATES", "HORAIRES", "CLASSES", "DUREES", "OBSERVATIONS"],
        ],
        body,
        startY: tableStartY,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: { top: 1.2, bottom: 0.6 },
          halign: "center",
          valign: "middle",
          textColor: [30, 30, 20],
          lineColor: [180, 180, 180],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { halign: "center", valign: "middle", cellWidth: 22 },
          1: { halign: "center", valign: "middle", cellWidth: 28 },
          2: { halign: "center", valign: "middle", cellWidth: 50 },
          3: { halign: "center", valign: "middle", cellWidth: 22 },
          4: { halign: "center", valign: "middle", cellWidth: 20 },
          5: { halign: "center", valign: "middle", cellWidth: 40 },
        },
        foot: [
          [
            {
              content: "TOTAL",
              colSpan: 4,
              styles: { halign: "right", fontStyle: "bold", cellPadding: 4 },
            },
            {
              content: `${totalHours}H`,
              styles: { halign: "center", fontStyle: "bold" },
            },
            { content: "", styles: { halign: "center" } },
          ],
        ],
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        showHead: "firstPage",
        showFoot: "lastPage",
        didDrawPage: (data: any) => {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `HMS - FPJ-${dateFrom.toLocaleDateString("fr-FR", { month: "long" })}-${dateFrom.getFullYear()}`,
            pageWidth - 14,
            pageHeight - 10,
            { align: "right" },
          );
          if (data.pageNumber > 1) {
            doc.text("Suite", pageWidth / 2, 10, { align: "center" });
          }
        },
        didDrawCell: (data: any) => {
          if (
            data.section === "body" &&
            data.column.index === 5 &&
            signatureDataUrl
          ) {
            const imgWidth = 8;
            const imgHeight = 5;
            if (imgWidth > 0 && imgHeight > 0) {
              const rowOffsetX = (Math.random() - 0.5) * 2;
              const rowOffsetY = (Math.random() - 0.5) * 1;
              const rowAngle = (Math.random() - 0.5) * 2;
              const x =
                data.cell.x + (data.cell.width - imgWidth) / 2 + rowOffsetX;
              const y =
                data.cell.y + (data.cell.height - imgHeight) / 2 + rowOffsetY;
              (doc as any).saveGraphicsState?.();
              (doc as any).translate?.(x + imgWidth / 2, y + imgHeight / 2);
              (doc as any).rotate?.((rowAngle * Math.PI) / 180);
              (doc as any).translate?.(
                -(x + imgWidth / 2),
                -(y + imgHeight / 2),
              );
              doc.addImage(signatureDataUrl, "PNG", x, y, imgWidth, imgHeight);
              (doc as any).restoreGraphicsState?.();
            }
          }
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
        if (totalPages > 1 && i < totalPages) {
          doc.text("A suivre", pageWidth / 2, pageHeight - 10, {
            align: "center",
          });
        }
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
      setFpjPdfUrl(blobUrl);
      setFpjModalOpen(true);
    } catch {
      toast.error("Erreur lors de la génération du FPJ");
    }
  };

  useEffect(() => {
    setRepartitions([]);
    fetchWeekRepartitions();
  }, [currentWeekStart]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[rgb(179,181,184)]"></h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-[rgb(203_210,224)] min-w-45 text-center">
              {formatDateFr(weekDates[0])} - {formatDateFr(weekDates[5])}
            </span>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <ImportEdtButton
              onClick={handleImportEdt}
              disabled={importingEdt || loadingWeek}
            >
              <CalendarDays className="h-4 w-4" />
              Importer EDT
            </ImportEdtButton>
            <ExportPdfButton
              onClick={handleExportFpj}
              disabled={repartitions.length === 0}
            >
              <FileText className="h-4 w-4" />
              PDF
            </ExportPdfButton>
          </div>
        </div>

        <Card className="h-full flex flex-col">
          <div className="h-[69.4vh] rounded-md border border-[rgb(55_65_81)] bg-[#1e1e21] overflow-x-auto">
            <table
              className="w-full text-sm"
              style={{ tableLayout: "fixed", minWidth: 920 }}
            >
              <colgroup>
                <col style={{ width: 110 }} />
                {DAYS.map((day) => (
                  <col
                    key={day}
                    style={{ width: "calc((100% - 110px) / 6)" }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-[#1b2234]">
                  <th className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]">
                    Créneau
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="p-1.5 text-center text-[11px] font-medium text-[rgb(203_210_224)]"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slotLabel, positionIndex) => (
                  <tr
                    key={slotLabel}
                    className="border-t border-[rgb(55_65_81)]"
                  >
                    <td className="p-1.5 text-center text-[11px] font-medium text-[rgb(156_163_175)] bg-[#1e1e21]">
                      {slotLabel}
                    </td>
                    {weekDates.map((date) => {
                      const dateKey = formatDateLocal(date);
                      const entry = repartitions.find(
                        (r) =>
                          r.date === dateKey &&
                          r.position === positionIndex + 1,
                      );

                      return (
                        <td
                          key={dateKey}
                          className="p-1 align-top bg-[#1e1e21] group"
                        >
                          <div className="relative rounded border border-[rgb(55_65_81)] bg-[#1e1e21] p-1.5 min-h-12 flex items-center justify-center gap-1">
                            {entry?.trimestreId && (
                              <span
                                className="absolute top-1 right-1 inline-flex h-2.5 w-2.5 rounded-full bg-green-500"
                                title="Programme enregistré"
                              />
                            )}
                            {entry ? (
                              <div className="flex flex-wrap items-center justify-center gap-1 text-[13px] text-[rgb(203_210_224)] mr-2">
                                {entry.classeLabel && (
                                  <Badge
                                    variant="outline"
                                    className={`${getClasseColor(entry.classeLabel || "")} px-1 py-0.5 rounded`}
                                  >
                                    {entry.classeLabel}
                                  </Badge>
                                )}
                                {/Pratique\s*:/i.test(entry.task || "") && (
                                  <span className="text-[10px] font-medium text-[rgb(239,68,68)]">
                                    Pratique
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[rgb(107_114_128)] text-xs"></div>
                            )}
                            <div className="hidden group-hover:flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={` ${!entry ? "h-6 w-6" : entry?.statut === "NON_FAIT" ? "h-6 w-6" : "h-0 w-0"} `}
                                onClick={() =>
                                  openAddDialog(dateKey, positionIndex + 1)
                                }
                              >
                                {entry ? (
                                  <>
                                    {entry.statut === "NON_FAIT" && (
                                      <Pencil className="h-2 w-2" />
                                    )}
                                  </>
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              {entry && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-6 w-6 ${entry.statut !== "NON_FAIT" ? "text-[rgb(82,241,68)]" : "text-[rgb(212,68,241)]"}`}
                                  onClick={() => handleMajStatut(entry.id)}
                                >
                                  {entry.statut !== "NON_FAIT" ? (
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                              {entry && entry.statut === "NON_FAIT" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-[rgb(241_68_68)]"
                                  onClick={() =>
                                    handleClearSlot(dateKey, positionIndex + 1)
                                  }
                                >
                                  <Trash2 className="h-2 w-2" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog
          open={!!editingSlot}
          onOpenChange={(open) => !open && closeDialog()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[rgb(243_244_246)]">
                {editingSlot
                  ? `${editingEntry ? "Modifier" : "Ajouter"} - ${formatDateFr(new Date(editingSlot.date))} - Créneau ${editingSlot.position}`
                  : "Répartition"}
              </DialogTitle>
              {editingEntry && (
                <p className="text-xs text-[rgb(156_163_175)]">
                  Cette répartition existe déjà. Modifiez-la ou supprimez-la.
                </p>
              )}
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-[rgb(156_163_175)]">
                  Classe
                </label>
                <Select
                  value={formClasseId}
                  onValueChange={setFormClasseId}
                  disabled={!!editingEntry}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[rgb(156_163_175)]">
                  Trimestre
                </label>
                <Select
                  value={formTrimestreId}
                  onValueChange={(v) => {
                    setFormTrimestreId(v);
                    setFormTitreId("");
                    setFormObjectifId("");
                    setFormPratiqueId("");
                    setFormOtherId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {trimestres.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.numero} - {t.lecon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formTrimestreId && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-[rgb(156_163_175)]">
                      Titre
                    </label>
                    <Select
                      value={formTitreId}
                      onValueChange={(v) => {
                        setFormTitreId(v);
                        setFormObjectifId("");
                        setFormPratiqueId("");
                        setFormOtherId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Titre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-</SelectItem>
                        {getFilteredCahierItems(
                          cahiers,
                          formTrimestreId,
                          "titre",
                        ).map((item: any) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.label || String(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[rgb(156_163_175)]">
                      Objectif
                    </label>
                    <Select
                      value={formObjectifId}
                      onValueChange={setFormObjectifId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Objectif" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-</SelectItem>
                        {getFilteredCahierItems(
                          cahiers,
                          formTrimestreId,
                          "objectif",
                          formTitreId,
                        ).map((item: any) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.label || String(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[rgb(156_163_175)]">
                      Pratique [Exercice]
                    </label>
                    <Select
                      value={formPratiqueId}
                      onValueChange={setFormPratiqueId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pratique [Exercice]" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-</SelectItem>
                        {getFilteredCahierItems(
                          cahiers,
                          formTrimestreId,
                          "pratique",
                          formTitreId,
                        ).map((item: any) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.label || String(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[rgb(156_163_175)]">
                      Autres
                    </label>
                    <Select value={formOtherId} onValueChange={setFormOtherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Autres" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-</SelectItem>
                        <SelectItem value="lecon-image">
                          Léçon en image
                        </SelectItem>
                        <SelectItem value="medias">Médias</SelectItem>
                        <SelectItem value="code">Code</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={closeDialog}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveSlot}
                  disabled={
                    !formClasseId ||
                    !formTrimestreId ||
                    !formTitreId ||
                    !formObjectifId ||
                    !formPratiqueId ||
                    !formOtherId
                  }
                >
                  {editingEntry ? "Modifier" : "Ajouter"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {fpjModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="relative flex-1 overflow-hidden bg-white">
            <button
              onClick={() => {
                setFpjModalOpen(false);
                setFpjPdfUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
              className="absolute top-1 right-1 z-10 rounded bg-black/60 text-red-500  hover:bg-black/80 w-5 h-5 flex items-center justify-center cursor-pointer"
            >
              X
            </button>
            {fpjPdfUrl && (
              <iframe
                src={fpjPdfUrl}
                className="w-full h-full border-0"
                title="Prévisualisation FPJ"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
