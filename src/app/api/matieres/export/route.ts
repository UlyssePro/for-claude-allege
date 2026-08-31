import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  const format = request.nextUrl.searchParams.get("format") || "csv";

  const matieres = await prisma.matiere.findMany({
    where: {
      ...(search ? { label: { contains: search } } : {}),
    },
    select: {
      id: true,
      label: true,
      abrev: true,
      _count: { select: { notes: true } },
    },
    orderBy: { label: "asc" },
  });

  if (format === "pdf") {
    return generatePdf(matieres);
  }

  const headers = ["#", "Label", "Abréviation", "Nb notes"];
  const rows = matieres.map((m, i) => [
    i + 1,
    m.label || "",
    m.abrev || "-",
    m._count.notes,
  ]);

  const csv = [
    headers.join(";"),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");

  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"matieres.csv\"",
    },
  });
}

async function generatePdf(
  matieres: { label: string; abrev: string | null; _count: { notes: number } }[]
) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF("p", "mm", "a4");
  doc.setFontSize(14);
  doc.text("Ecole HMS", 14, 10);
  doc.setFontSize(10);
  doc.text(`Liste des matières (${new Date().toLocaleDateString("fr-FR")})`, 14, 16);

  const marginLeft = 14;
  const lineHeight = 5;
  const startY = 22;
  const colWidths = [10, 60, 40, 30];
  const headers = ["#", "Label", "Abréviation", "Nb notes"];

  const lines: string[][] = [];
  for (let i = 0; i < matieres.length + 1; i++) {
    const y = startY + i * lineHeight;
    if (y > 275) break;
    const row = i === 0 ? headers : (matieres[i - 1] ? [
      String(i),
      matieres[i - 1].label || "",
      matieres[i - 1].abrev || "-",
      String(matieres[i - 1]._count.notes),
    ] : ["", "", "", ""]);

    let x = marginLeft;
    row.forEach((cell, j) => {
      doc.text(String(cell), x, y);
      x += colWidths[j] || 15;
    });
  }

  doc.setFontSize(7);
  doc.text(`Total: ${matieres.length} matières`, marginLeft, 285);

  const pdfBytes = doc.output("arraybuffer");
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"matieres.pdf\"",
    },
  });
}
