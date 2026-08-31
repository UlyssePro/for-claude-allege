export const matiereCategory: Record<string, string> = {
  maths: "bg-[rgba(0,114,206,0.1)] text-[#00A3E0] border-[rgba(0,163,224,0.2)]",
  scientifique: "bg-[rgba(34,197,94,0.1)] text-[#22c55e] border-[rgba(34,197,94,0.2)]",
  langue: "bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]",
  humanite: "bg-[rgba(168,85,247,0.1)] text-[#a855f7] border-[rgba(168,85,247,0.2)]",
  sport: "bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]",
  informatique: "bg-[rgba(34,197,94,0.1)] text-[#22c55e] border-[rgba(34,197,94,0.2)]",
  inconnue: "bg-[rgba(30,41,59,0.8)] text-[#94a3b8] border-[#1e293b]",
};

export function getMatiereColor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("math") || l.includes("arithmétique")) return matiereCategory.maths;
  if (l.includes("physique") || l.includes("chimie") || l.includes("science")) return matiereCategory.scientifique;
  if (l.includes("français") || l.includes("anglais") || l.includes("allemand") || l.includes("malagasy") || l.includes("langue")) return matiereCategory.langue;
  if (l.includes("philosophie") || l.includes("histoire") || l.includes("géo") || l.includes("citoyen")) return matiereCategory.humanite;
  if (l.includes("eps") || l.includes("sport")) return matiereCategory.sport;
  if (l.includes("informatique")) return matiereCategory.informatique;
  return matiereCategory.inconnue;
}

export const classeColors: Record<string, string> = {
  "6": "bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[rgba(239,68,68,0.2)]",
  "5": "bg-[rgba(0,114,206,0.1)] text-[#60a5fa] border-[rgba(0,114,206,0.2)]",
  "4": "bg-[rgba(245,158,11,0.1)] text-[#fbbf24] border-[rgba(245,158,11,0.2)]",
  "3": "bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.2)]",
  "2": "bg-[rgba(168,85,247,0.1)] text-[#c084fc] border-[rgba(168,85,247,0.2)]",
  "1": "bg-[rgba(244,114,182,0.1)] text-[#f472b6] border-[rgba(244,114,182,0.2)]",
  "T": "bg-[rgba(147,51,234,0.1)] text-[#a855f7] border-[rgba(147,51,234,0.2)]",
};

export function getClasseColor(label: string): string {
  const l = label.trim();
  if (l.startsWith("6")) return classeColors["6"];
  if (l.startsWith("5")) return classeColors["5"];
  if (l.startsWith("4")) return classeColors["4"];
  if (l.startsWith("3")) return classeColors["3"];
  if (l.startsWith("2")) return classeColors["2"];
  if (l.startsWith("PS") || l.startsWith("PT") || l.startsWith("ES") || l.startsWith("L") || l.startsWith("1")) return classeColors["1"];
  if (l.startsWith("T")) return classeColors["T"];
  return "bg-[rgba(30,41,59,0.8)] text-[#94a3b8] border-[#1e293b]";
}

export function getClasseColorRgb(label: string): [number, number, number] | null {
  const l = label.trim();
  if (l.startsWith("6")) return [239, 68, 68];
  if (l.startsWith("5")) return [0, 114, 206];
  if (l.startsWith("4")) return [245, 158, 11];
  if (l.startsWith("3")) return [34, 197, 94];
  if (l.startsWith("2")) return [168, 85, 247];
  if (l.startsWith("PS") || l.startsWith("PT") || l.startsWith("ES") || l.startsWith("L") || l.startsWith("1")) return [244, 114, 182];
  if (l.startsWith("T")) return [147, 51, 234];
  return null;
}

export const genreColors: Record<string, string> = {
  Masculin: "bg-[rgba(0,114,206,0.1)] text-[#60a5fa] border-[rgba(0,114,206,0.2)]",
  Féminin: "bg-[rgba(244,114,182,0.1)] text-[#f472b6] border-[rgba(244,114,182,0.2)]",
};

export function getGenreColor(gen: string): string {
  return genreColors[gen] || "bg-[rgba(30,41,59,0.8)] text-[#94a3b8] border-[#1e293b]";
}

export const roleColors: Record<string, string> = {
  SuperAdmin: "bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[rgba(239,68,68,0.2)]",
  Admin: "bg-[rgba(0,163,224,0.1)] text-[#00A3E0] border-[rgba(0,163,224,0.2)]",
  Enseignant: "bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.2)]",
  Prof: "bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.2)]",
  Eleve: "bg-[rgba(168,85,247,0.1)] text-[#c084fc] border-[rgba(168,85,247,0.2)]",
  Utilisateur: "bg-[rgba(245,158,11,0.1)] text-[#fbbf24] border-[rgba(245,158,11,0.2)]",
};

export function getRoleColor(label: string): string {
  if (!label) return "bg-[rgba(30,41,59,0.8)] text-[#94a3b8] border-[#1e293b]";
  return roleColors[label] || roleColors[label.toLowerCase()] || "bg-[rgba(30,41,59,0.8)] text-[#94a3b8] border-[#1e293b]";
}

export function getBadgeClass(label: string, map: Record<string, string>) {
  return map[label] || "bg-[rgba(30,41,59,0.8)] text-[#94a3b8] border-[#1e293b]";
}

// Palette cyclique pour les lieux — couleur déterministe basée sur le libellé
const lieuPalette = [
  "bg-[rgba(20,136,252,0.1)] text-[#38bdf8] border-[rgba(20,136,252,0.2)]",   // bleu ciel
  "bg-[rgba(16,185,129,0.1)] text-[#34d399] border-[rgba(16,185,129,0.2)]",   // émeraude
  "bg-[rgba(245,158,11,0.1)] text-[#fbbf24] border-[rgba(245,158,11,0.2)]",   // ambre
  "bg-[rgba(168,85,247,0.1)] text-[#c084fc] border-[rgba(168,85,247,0.2)]",   // violet
  "bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[rgba(239,68,68,0.2)]",     // rose/rouge
  "bg-[rgba(244,114,182,0.1)] text-[#f472b6] border-[rgba(244,114,182,0.2)]", // rose vif
  "bg-[rgba(99,102,241,0.1)] text-[#818cf8] border-[rgba(99,102,241,0.2)]",   // indigo
  "bg-[rgba(20,184,166,0.1)] text-[#2dd4bf] border-[rgba(20,184,166,0.2)]",   // teal
];

export function getLieuColor(label: string): string {
  if (!label) return "bg-[rgba(30,41,59,0.8)] text-[#94a3b8] border-[#1e293b]";
  const l = label.toLowerCase();
  // Correspondances sémantiques explicites
  if (l.includes("matin") || l.includes("am")) return lieuPalette[0];
  if (l.includes("soir") || l.includes("pm") || l.includes("après")) return lieuPalette[4];
  if (l.includes("principal") || l.includes("central") || l.includes("main")) return lieuPalette[2];
  if (l.includes("annexe") || l.includes("secondaire")) return lieuPalette[3];
  if (l.includes("salle") || l.includes("amphi")) return lieuPalette[6];
  if (l.includes("inter") || l.includes("exte")) return lieuPalette[5];
  // Couleur déterministe cyclique basée sur le hash du libellé
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return lieuPalette[hash % lieuPalette.length];
}