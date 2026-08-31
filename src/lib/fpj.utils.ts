export const ListMonth = [
  { id: "1", label: "Janvier" },
  { id: "2", label: "Février" },
  { id: "3", label: "Mars" },
  { id: "4", label: "Avril" },
  { id: "5", label: "Mai" },
  { id: "6", label: "Juin" },
  { id: "7", label: "Juillet" },
  { id: "8", label: "Août" },
  { id: "9", label: "Septembre" },
  { id: "10", label: "Octobre" },
  { id: "11", label: "Novembre" },
  { id: "12", label: "Décembre" },
];

export const convertDateToFr = (d: Date | string | undefined): string => {
  if (d) {
    const date = new Date(d);
    const day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
    const month =
      date.getMonth() + 1 < 10
        ? "0" + (date.getMonth() + 1)
        : date.getMonth() + 1;
    const year = date.getFullYear();
    return day + "-" + month + "-" + year;
  }
  return "";
};

export const convertDayToLetter = (d: number): string => {
  if (d === 1) return "Lundi";
  if (d === 2) return "Mardi";
  if (d === 3) return "Mercredi";
  if (d === 4) return "Jeudi";
  if (d === 5) return "Vendredi";
  if (d === 6) return "Samedi";
  if (d === 7) return "Dimanche";
  return "";
};

export const horaires = [
  { id: "00", hour: "" },
  { id: "1", hour: "06h45 - 07h45" },
  { id: "2", hour: "07h45 - 08h45" },
  { id: "3", hour: "08h45 - 09h45" },
  { id: "0", hour: "09h45 - 10h00" },
  { id: "4", hour: "10h00 - 11h00" },
  { id: "5", hour: "11h00 - 12h00" },
  { id: "6", hour: "14h30 - 15h30" },
  { id: "7", hour: "15h30 - 16h30" },
  { id: "8", hour: "16h30 - 17h30" },
];

export const lieuxEcoles = [
  { id: "1", labellieu: "Tanambao Centre" },
  { id: "2", labellieu: "Mosquée - Bazar be" },
  { id: "3", labellieu: "Tanambao Motombe" },
  { id: "4", labellieu: "Tous les lieux" },
];
