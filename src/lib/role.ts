export function normalizeRole(label: string | null): "admin" | "prof" | "eleve" {
  if (!label) return "eleve";
  const l = label.toLowerCase();
  if (l.includes("enseignant") || l.includes("prof")) return "prof";
  if (l.includes("superadmin") || l.includes("admin")) return "admin";
  return "eleve";
}
