import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  const typeId = request.nextUrl.searchParams.get("typeId");
  const categorieId = request.nextUrl.searchParams.get("categorieId");
  const format = request.nextUrl.searchParams.get("format") || "csv";

  const classes = await prisma.classe.findMany({
    where: {
      ...(search ? { label: { contains: search } } : {}),
      ...(categorieId ? { categorieId: categorieId } : {}),
    },
    select: {
      id: true,
      label: true,
      categorie: { select: { label: true } },
      lieu: { select: { label: true } },
      _count: { select: { eleves: true } },
    },
    orderBy: { label: "asc" },
  });

  const classRows = classes as Array<{
    label: string;
    categorie: { label: string } | null;
    lieu: { label: string } | null;
    _count: { eleves: number };
  }>;

  if (format === "pdf") {
    return generatePdf(classRows);
  }

  const headers = ["#", "Label", "Catégorie", "Lieu", "Nb élèves"];
  const rows = classRows.map((c, i) => [
    i + 1,
    c.label || "",
    c.categorie?.label || "-",
    c.lieu?.label || "-",
    c._count.eleves,
  ]);

  const csv = [
    headers.join(";"),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");

  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"classes.csv\"",
    },
  });
}

async function generatePdf(
  classes: {
    label: string;
    categorie: { label: string } | null;
    lieu: { label: string } | null;
    _count: { eleves: number };
  }[]
) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF("p", "mm", "a4");
  doc.setFontSize(14);
  doc.text("Ecole HMS", 14, 10);
  doc.setFontSize(10);
  doc.text(`Liste des classes (${new Date().toLocaleDateString("fr-FR")})`, 14, 16);

  const marginLeft = 14;
  const lineHeight = 5;
  const startY = 22;
  const colWidths = [10, 40, 35, 35, 20];
  const headers = ["#", "Label", "Catégorie", "Lieu", "Nb élèves"];

  for (let i = 0; i < classes.length + 1; i++) {
    const y = startY + i * lineHeight;
    if (y > 275) break;
    const row = i === 0 ? headers : (classes[i - 1] ? [
      String(i),
      classes[i - 1].label || "",
      classes[i - 1].categorie?.label || "",
      classes[i - 1].lieu?.label || "",
      String(classes[i - 1]._count.eleves),
    ] : ["", "", "", "", ""]);

    let x = marginLeft;
    row.forEach((cell, j) => {
      doc.text(String(cell), x, y);
      x += colWidths[j] || 15;
    });
  }

  doc.setFontSize(7);
  doc.text(`Total: ${classes.length} classes`, marginLeft, 285);

  const pdfBytes = doc.output("arraybuffer");
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"classes.pdf\"",
    },
  });
}
