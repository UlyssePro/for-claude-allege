import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const categorieId = request.nextUrl.searchParams.get("categorieId");
  const format = request.nextUrl.searchParams.get("format") || "csv";

  const enseignants = await prisma.enseignant.findMany({
    where: {
      ...(categorieId ? { categorieId } : {}),
    },
    select: {
      nom: true,
      prenom: true,
      contact: true,
      adresse: true,
      dpservice: true,
      profSess: true,
      matiere: { select: { label: true } },
      categorie: { select: { label: true } },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  if (format === "pdf") {
    return generatePdf(enseignants, categorieId);
  }

  const headers = ["#", "Nom", "Prénom", "Matière", "Catégorie", "Contact", "Adresse", "Service", "Session"];
  const rows = enseignants.map((e, i) => [
    i + 1,
    e.nom || "",
    e.prenom || "",
    e.matiere?.label || "-",
    e.categorie?.label || "-",
    e.contact || "-",
    e.adresse || "-",
    e.dpservice || "-",
    e.profSess || "-",
  ]);

  const csv = [
    headers.join(";"),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");

  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enseignants${categorieId ? "-categorie-" + categorieId : ""}.csv"`,
    },
  });
}

async function generatePdf(
  enseignants: {
    nom: string; prenom: string; contact: string | null;
    adresse: string | null; dpservice: string | null; profSess: string | null;
    matiere: { label: string } | null; categorie: { label: string } | null;
  }[],
  categorieId: string | null,
) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF("p", "mm", "a4");
  doc.setFontSize(14);
  doc.text("Ecole HMS", 14, 10);
  doc.setFontSize(10);
  doc.text(`Liste des enseignants (${new Date().toLocaleDateString("fr-FR")})`, 14, 16);

  const marginLeft = 14;
  const lineHeight = 5;
  const startY = 22;
  const colWidths = [8, 25, 25, 20, 20, 22, 22, 18, 18];
  const headers = ["#", "Nom", "Prénom", "Matière", "Catégorie", "Contact", "Adresse", "Service", "Session"];

  const lines: string[][] = [];
  for (let i = 0; i < 12; i++) {
    const y = startY + i * lineHeight;
    if (y > 275) break;
    const row = i === 0 ? headers : (enseignants[i - 1] ? [
      String(i),
      enseignants[i - 1].nom || "",
      enseignants[i - 1].prenom || "",
      enseignants[i - 1].matiere?.label || "",
      enseignants[i - 1].categorie?.label || "",
      enseignants[i - 1].contact || "",
      enseignants[i - 1].adresse || "",
      enseignants[i - 1].dpservice || "",
      enseignants[i - 1].profSess || "",
    ] : ["", "", "", "", "", "", "", "", ""]);

    let x = marginLeft;
    row.forEach((cell, j) => {
      doc.text(String(cell), x, y);
      x += colWidths[j] || 15;
    });
  }

  doc.setFontSize(7);
  doc.text(`Total: ${enseignants.length} enseignants`, marginLeft, 285);

  const pdfBytes = doc.output("arraybuffer");
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="enseignants${categorieId ? "-categorie-" + categorieId : ""}.pdf"`,
    },
  });
}
