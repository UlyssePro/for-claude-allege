"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CustomTable } from "@/components/ui/custom-table";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { SearchInput } from "@/components/ui/search-input";
import { getMatiereColor, getClasseColor } from "@/lib/badge-colors";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { useCrudList } from "@/hooks/use-crud-list";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";
import { useAdminSession } from "@/contexts/session-context";

interface Repartition {
  id: string;
  numItem: number | null;
  date: Date | string | null;
  position: number | null;
  taux: number | null;
  statut: string;
  matiere: { label: string; abrev: string | null } | null;
  enseignant: { nom: string; prenom: string } | null;
  classe: { label: string } | null;
  lieuEcole: { label: string } | null;
}

interface ClasseRef {
  id: string;
  label: string;
}

interface MatiereRef {
  id: string;
  label: string;
}

interface EnseignantRef {
  id: string;
  nom: string;
  prenom: string;
}

interface LieuRef {
  id: string;
  label: string;
}

interface StatutRef {
  value: string;
  label: string;
}

export default function RepartitionsPage() {
  const { adminSessionId } = useAdminSession();
  const {
    items: repartitions,
    filters,
    handleFilterChange,
  } = useCrudList<
    Repartition,
    {
      search: string;
      classeId: string;
      matiereId: string;
      enseignantId: string;
      lieuId: string;
      statut: string;
    }
  >(
    "/api/repartitions",
    {
      search: "",
      classeId: "",
      matiereId: "",
      enseignantId: "",
      lieuId: "",
      statut: "",
    },
    undefined,
    adminSessionId,
  );
  const { modePdf, pdfUrl, openPdf, closePdf } = usePdfPreview();

  const [classes, setClasses] = useState<ClasseRef[]>([]);
  const [matieres, setMatieres] = useState<MatiereRef[]>([]);
  const [enseignants, setEnseignants] = useState<EnseignantRef[]>([]);
  const [lieux, setLieux] = useState<LieuRef[]>([]);
  const [statuts, setStatuts] = useState<StatutRef[]>([]);

  const fetchRefs = async () => {
    try {
      const res = await fetch("/api/repartitions/refs");
      const data = await res.json();
      setClasses(data.classes || []);
      setMatieres(data.matieres || []);
      setEnseignants(data.enseignants || []);
      setLieux(data.lieux || []);
      setStatuts(data.statuts || []);
    } catch {
      console.error("Failed to load refs");
    }
  };

  useEffect(() => {
    fetchRefs();
  }, []);

  const statutColor = (statut: string) => {
    switch (statut) {
      case "FAIT":
        return "bg-[rgb(74_222_124)]/20 text-[rgb(74_222_124)]";
      case "VERROUILLE":
        return "bg-[rgb(239_68_68)]/20 text-[rgb(239_68_68)]";
      default:
        return "bg-[rgba(30,41,59,0.8)] text-[#94a3b8]";
    }
  };

  const formatDate = (d: Date | string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("fr-FR");
  };

  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("l", "mm", "a4");

      await addSchoolPdfHeader(doc, {
        title: "LISTE DES RÉPARTITIONS",
        countLabel: `${repartitions.length} RÉPARTITIONS`,
      });

      const tableColumn = [
        "#",
        "Date",
        "Matière",
        "Enseignant",
        "Classe",
        "Lieu",
        "Statut",
      ];
      const tableRows: string[][] = [];

      repartitions.forEach((r, idx) => {
        tableRows.push([
          String(idx + 1),
          formatDate(r.date),
          r.matiere?.label || "-",
          r.enseignant ? `${r.enseignant.prenom} ${r.enseignant.nom}` : "-",
          r.classe?.label || "-",
          r.lieuEcole?.label || "-",
          r.statut || "-",
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
          1: { cellWidth: 35, halign: "center" },
          2: { cellWidth: 50, halign: "center" },
          3: { cellWidth: 50 },
          4: { cellWidth: 40, halign: "center" },
          5: { cellWidth: 40, halign: "center" },
          6: { cellWidth: 35, halign: "center" },
        },
      });

      addSchoolPdfFooter(doc, "HMS-Repartitions");

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
            value={filters.classeId}
            onValueChange={(v) => handleFilterChange("classeId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-35">
          <Select
            value={filters.matiereId}
            onValueChange={(v) => handleFilterChange("matiereId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes matières" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes matières</SelectItem>
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
            value={filters.enseignantId}
            onValueChange={(v) => handleFilterChange("enseignantId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous enseignants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous enseignants</SelectItem>
              {enseignants.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nom} {e.prenom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-35">
          <Select
            value={filters.statut}
            onValueChange={(v) => handleFilterChange("statut", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous statuts</SelectItem>
              {statuts.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ExportPdfButton onClick={handleExportPdf}>
          <FileText className="h-4 w-4" />
          PDF
        </ExportPdfButton>
      </div>

      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 overflow-hidden">
          <CustomTable
            columns={[
              {
                header: "Date",
                accessor: (r) => (
                  <span className="text-[rgb(243_244_246)] text-sm text-[10px] ">
                    {formatDate(r.date)}
                  </span>
                ),
                width: "90px",
                className: "text-center",
              },
              {
                header: "Matière",
                accessor: (r) =>
                  r.matiere ? (
                    <Badge
                      className={`${getMatiereColor(r.matiere.label)} text-[10px] `}
                    >
                      {r.matiere.label}
                    </Badge>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  ),
                width: "100px",
              },
              {
                header: "Enseignant",
                accessor: (r) => (
                  <span className="text-[rgb(203_210_224)] text-sm text-[10px] ">
                    {r.enseignant ? `${r.enseignant.prenom}` : "-"}
                  </span>
                ),
                width: "120px",
              },
              {
                header: "Classe",
                accessor: (r) =>
                  r.classe ? (
                    <Badge className={`${getClasseColor(r.classe.label)}`}>
                      {r.classe.label}
                    </Badge>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  ),
                width: "80px",
                className: "text-center",
              },
              {
                header: "Lieu",
                accessor: (r) => (
                  <span className="text-[#94a3b8] text-sm text-[10px]">
                    {r.lieuEcole?.label || "-"}
                  </span>
                ),
                width: "100px",
              },
              {
                header: "Statut",
                accessor: (r) => (
                  <Badge
                    className={`${statutColor(r.statut)} text-[10px]`}
                    variant="secondary"
                  >
                    {r.statut}
                  </Badge>
                ),
                width: "90px",
              },
            ]}
            data={repartitions}
          />
        </CardContent>
      </Card>

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
