"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FileDown,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

const HORAIRES = [
  { id: "1", hour: "07h-08h" },
  { id: "2", hour: "08h-09h" },
  { id: "3", hour: "09h-10h" },
  { id: "4", hour: "10h-11h" },
  { id: "5", hour: "11h-12h" },
  { id: "6", hour: "14h-15h" },
  { id: "7", hour: "15h-16h" },
  { id: "8", hour: "16h-17h" },
];

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

type RepartitionRow = {
  id: string;
  date: string;
  hourId?: string;
  horaireId?: string;
  classeId: string;
  lieuId?: string;
  taux?: string | number | null;
  matiereId?: string;
  enseignantId?: string;
  task?: string;
  done?: boolean | number;
};

type DataUserPage = {
  dateFrom?: string;
  dateTo?: string;
  idProf?: string;
  idMat?: string;
  idLieu?: string;
  sessionYearSchoolSM?: string;
};

type DatasBody = {
  dataUserPage?: DataUserPage | null;
  repartitions?: RepartitionRow[];
};

type FpjViewPageProps = {
  datasBody: DatasBody;
  enseignants?: { id: string; prenom?: string }[];
  matieres?: { id: string; label?: string }[];
  classes?: { id: string; label?: string }[];
};

const FpjViewPage = ({
  datasBody,
  enseignants,
  matieres,
  classes,
}: FpjViewPageProps) => {
  const [open, setOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const weekDates = useMemo(
    () => getWeekDates(currentWeekStart),
    [currentWeekStart],
  );

  const convertClasse = (id: string) => {
    const found = classes?.find((c) => c.id === id);
    return found?.label || "-";
  };

  const convertProf = (id: string) => {
    const found = enseignants?.find((e) => e.id === id);
    return found?.prenom || "-";
  };

  const convertMatiere = (id: string) => {
    const found = matieres?.find((m) => m.id === id);
    return found?.label || "-";
  };

  const convertLieu = (id: string) => {
    const found = datasBody.dataUserPage?.idLieu ? undefined : undefined;
    return "-";
  };

  const getFilteredDatas = () => {
    if (!datasBody.repartitions) return [];

    const { idMat, idProf, idLieu, dateFrom, dateTo } =
      datasBody.dataUserPage || {};

    return datasBody.repartitions
      .filter((p) => {
        const matchesMatiere = !idMat || p.matiereId === idMat;
        const matchesProf = !idProf || p.enseignantId === idProf;
        const hasClasse = p.classeId && p.classeId !== "";
        const isDone = p.done === true || p.done === 1 || p.task === "1";
        const matchesLieu = idLieu === "4" || !idLieu || p.lieuId === idLieu;
        const inRange =
          !dateFrom ||
          !dateTo ||
          (p.date && p.date >= dateFrom && p.date <= dateTo);

        return (
          matchesMatiere &&
          matchesProf &&
          hasClasse &&
          isDone &&
          matchesLieu &&
          inRange
        );
      })
      .sort((a, b) => {
        const hourA = a.horaireId || a.hourId || "";
        const hourB = b.horaireId || b.hourId || "";
        const hourCompare = hourA.localeCompare(hourB);
        if (hourCompare !== 0) return hourCompare;
        return a.date.localeCompare(b.date);
      });
  };

  const filteredDatas = getFilteredDatas();

  const headerInfo = datasBody.dataUserPage
    ? {
        mois: datasBody.dataUserPage.dateTo
          ? new Date(datasBody.dataUserPage.dateTo).toLocaleDateString(
              "fr-FR",
              {
                month: "long",
                year: "numeric",
              },
            )
          : undefined,
        titulaire: datasBody.dataUserPage.idProf
          ? convertProf(datasBody.dataUserPage.idProf)
          : undefined,
        lieu: datasBody.dataUserPage.idLieu
          ? convertLieu(datasBody.dataUserPage.idLieu)
          : undefined,
        matiere: datasBody.dataUserPage.idMat
          ? convertMatiere(datasBody.dataUserPage.idMat)
          : undefined,
      }
    : null;

  const handlePrint = () => {
    setOpen(true);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[rgb(179,181,184)]">
          Fiche de présence journalière
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-[rgb(203_210,224)] min-w-45 text-center">
            {formatDateFr(weekDates[0])} - {formatDateFr(weekDates[5])}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimer FPJ
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-[rgb(55_65_81)] bg-[rgb(17_24_39)] overflow-x-auto">
        <table
          className="w-full text-sm border-collapse"
          style={{ tableLayout: "fixed", minWidth: 900 }}
        >
          <thead className="sticky top-0 z-10 bg-[rgb(27_34_52)]">
            <tr className="bg-[rgb(17_24_39)]">
              <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                JOURS
              </th>
              <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                DATES
              </th>
              <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                HORAIRES
              </th>
              <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                CLASSES
              </th>
              <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                DUREES
              </th>
              <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                OBSERVATIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDatas.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center p-4 text-[rgb(156_163,175)]"
                >
                  Aucune donnée à afficher.
                </td>
              </tr>
            ) : (
              filteredDatas.map((d, i) => (
                <tr key={i} className="hover:bg-[rgb(17_24_39)]/50">
                  <td className="border border-[rgb(55_65_81)] p-2 text-center">
                    {new Date(d.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                    })}
                  </td>
                  <td className="border border-[rgb(55_65_81)] p-2 text-center">
                    {formatDateFr(new Date(d.date))}
                  </td>
                  <td className="border border-[rgb(55_65_81)] p-2 text-center">
                    {HORAIRES.find((h) => h.id === (d.horaireId || d.hourId))
                      ?.hour || "-"}
                  </td>
                  <td className="border border-[rgb(55_65_81)] p-2 text-center">
                    {convertClasse(d.classeId)}
                  </td>
                  <td className="border border-[rgb(55_65_81)] p-2 text-center">
                    1H
                  </td>
                  <td className="border border-[rgb(55_65_81)] p-2 text-center">
                    {d.task || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-none h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-[rgb(55_65_81)] flex-shrink-0">
            <DialogTitle className="text-[rgb(243_244,246)]">
              Impression FPJ
            </DialogTitle>
            {headerInfo && (
              <div className="text-xs text-[rgb(156_163,175)] mt-1 space-y-1">
                {headerInfo.mois && <p>MOIS DE : {headerInfo.mois}</p>}
                {headerInfo.titulaire && (
                  <p>TITULAIRE : {headerInfo.titulaire}</p>
                )}
                {headerInfo.lieu && <p>LIEU : {headerInfo.lieu}</p>}
                {headerInfo.matiere && <p>MATIERE : {headerInfo.matiere}</p>}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6">
            <table
              className="w-full text-sm border-collapse"
              style={{ tableLayout: "fixed", minWidth: 900 }}
            >
              <thead className="sticky top-0 z-10 bg-[rgb(27_34_52)]">
                <tr className="bg-[rgb(17_24_39)]">
                  <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                    JOURS
                  </th>
                  <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                    DATES
                  </th>
                  <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                    HORAIRES
                  </th>
                  <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                    CLASSES
                  </th>
                  <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                    DUREES
                  </th>
                  <th className="border border-[rgb(55_65_81)] p-2 text-center text-[rgb(203_210,224)]">
                    OBSERVATIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDatas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center p-4 text-[rgb(156_163,175)]"
                    >
                      Aucune donnée à afficher.
                    </td>
                  </tr>
                ) : (
                  filteredDatas.map((d, i) => (
                    <tr key={i} className="hover:bg-[rgb(17_24,39)]/50">
                      <td className="border border-[rgb(55_65_81)] p-2 text-center">
                        {new Date(d.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                        })}
                      </td>
                      <td className="border border-[rgb(55_65_81)] p-2 text-center">
                        {formatDateFr(new Date(d.date))}
                      </td>
                      <td className="border border-[rgb(55_65_81)] p-2 text-center">
                        {HORAIRES.find(
                          (h) => h.id === (d.horaireId || d.hourId),
                        )?.hour || "-"}
                      </td>
                      <td className="border border-[rgb(55_65_81)] p-2 text-center">
                        {convertClasse(d.classeId)}
                      </td>
                      <td className="border border-[rgb(55_65_81)] p-2 text-center">
                        1H
                      </td>
                      <td className="border border-[rgb(55_65_81)] p-2 text-center">
                        {d.task || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FpjViewPage;
