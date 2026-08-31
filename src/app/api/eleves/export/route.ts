import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const classeId = request.nextUrl.searchParams.get("classeId");
  const format = request.nextUrl.searchParams.get("format") || "csv";

  const eleves = await prisma.eleve.findMany({
    where: {
      ...(classeId ? { classeId } : {}),
    },
    select: {
      firstname: true,
      lastname: true,
      numero: true,
      contact: true,
      dob: true,
      age: true,
      sob: true,
      domic: true,
      obs: true,
      classe: { select: { label: true } },
      genre: { select: { label: true } },
    },
    orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
  });

  if (format === "pdf") {
    return generatePdf(eleves, classeId);
  }

  const headers = ["#", "Nom", "Prénom", "Classe", "N° classe", "Genre", "Naissance", "Âge", "Lieu naissance", "Domicile", "Contact", "Observation"];
  const rows = eleves.map((e, i) => [
    i + 1,
    e.lastname || "",
    e.firstname || "",
    e.classe?.label || "-",
    e.numero || "-",
    e.genre?.label || "-",
    e.dob || "-",
    e.age || "-",
    e.sob || "",
    e.domic || "",
    e.contact || "",
    e.obs || "",
  ]);

  const csv = [
    headers.join(";"),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");

  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eleves${classeId ? "-classe-" + classeId : ""}.csv"`,
    },
  });
}

async function generatePdf(
  eleves: {
    firstname: string; lastname: string; numero: string | null; contact: string | null;
    dob: string | null; sob: string | null; obs: string | null;
    classe: { label: string } | null; genre: { label: string } | null;
  }[],
  classeId: string | null,
) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF("p", "mm", "a4");
  doc.setFontSize(14);
  doc.text("Ecole HMS", 14, 10);
  doc.setFontSize(10);
  doc.text(`Liste des élèves (${new Date().toLocaleDateString("fr-FR")})`, 14, 16);

  const marginLeft = 14;
  const lineHeight = 5;
  const startY = 22;
  const colWidths = [8, 25, 25, 18, 15, 18, 20, 15, 25];
  const headers = ["#", "Nom", "Prénom", "Classe", "N°", "Genre", "Naissance", "Contact", "Obs"];

  const lines: string[][] = [];
  for (let i = 0; i < 12; i++) {
    const y = startY + i * lineHeight;
    if (y > 275) break;
    const row = i === 0 ? headers : (eleves[i - 1] ? [
      String(i),
      eleves[i - 1].lastname || "",
      eleves[i - 1].firstname || "",
      eleves[i - 1].classe?.label || "",
      eleves[i - 1].numero || "",
      eleves[i - 1].genre?.label || "",
      eleves[i - 1].dob || "",
      eleves[i - 1].contact || "",
      eleves[i - 1].obs || "",
    ] : ["", "", "", "", "", "", "", "", ""]);

    let x = marginLeft;
    row.forEach((cell, j) => {
      doc.text(String(cell), x, y);
      x += colWidths[j] || 15;
    });
  }

  doc.setFontSize(7);
  doc.text(`Total: ${eleves.length} élèves`, marginLeft, 285);

  const pdfBytes = doc.output("arraybuffer");
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="eleves${classeId ? "-classe-" + classeId : ""}.pdf"`,
    },
  });
}
