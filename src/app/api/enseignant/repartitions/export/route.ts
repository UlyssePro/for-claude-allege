import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const session = await getCurrentUser(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const enseignant = await prisma.enseignant.findFirst({
    where: { handledById: session.user.id },
    select: { id: true },
  });

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  const search = request.nextUrl.searchParams.get("search");
  const classeId = request.nextUrl.searchParams.get("classeId");
  const matiereId = request.nextUrl.searchParams.get("matiereId");
  const statut = request.nextUrl.searchParams.get("statut");
  const dateFrom = request.nextUrl.searchParams.get("dateFrom");
  const dateTo = request.nextUrl.searchParams.get("dateTo");
  const format = request.nextUrl.searchParams.get("format") || "csv";

  const where: any = { enseignantId: enseignant.id };
  if (classeId) where.classeId = classeId;
  if (matiereId) where.matiereId = matiereId;
  if (statut) where.statut = statut;

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      where.date.gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  if (search) {
    where.OR = [
      { matiere: { label: { contains: search } } },
      { classe: { label: { contains: search } } },
      { lieuEcole: { label: { contains: search } } },
    ];
  }

  const repartitions = await prisma.repartition.findMany({
    where,
    select: {
      id: true,
      date: true,
      position: true,
      taux: true,
      statut: true,
      matiere: { select: { label: true, abrev: true } },
      classe: { select: { label: true } },
      lieuEcole: { select: { label: true } },
    },
    orderBy: [{ date: "asc" }, { position: "asc" }],
  });

  if (format === "pdf") {
    return generatePdf(repartitions, dateFrom, dateTo);
  }

  const headers = ["#", "Date", "Matière", "Classe", "Lieu", "Statut"];
  const rows = repartitions.map((r, i) => [
    i + 1,
    r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "-",
    r.matiere?.label || "-",
    r.classe?.label || "-",
    r.lieuEcole?.label || "-",
    r.statut || "-",
  ]);

  const csv = [
    headers.join(";"),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");

  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"mes-repartitions.csv\"",
    },
  });
}

async function generatePdf(repartitions: any[], dateFrom?: string | null, dateTo?: string | null) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF("p", "mm", "a4");
  doc.setFontSize(14);
  doc.text("Ecole HMS", 14, 10);
  doc.setFontSize(10);
  const dateLabel = dateFrom && dateTo
    ? `Répartitions du ${new Date(dateFrom).toLocaleDateString("fr-FR")} au ${new Date(dateTo).toLocaleDateString("fr-FR")}`
    : `Mes répartitions (${new Date().toLocaleDateString("fr-FR")})`;
  doc.text(dateLabel, 14, 16);

  const marginLeft = 14;
  const lineHeight = 5;
  const startY = 22;
  const colWidths = [10, 25, 30, 35, 35, 20];
  const headers = ["#", "Date", "Matière", "Classe", "Lieu", "Statut"];

  for (let i = 0; i < repartitions.length + 1; i++) {
    const y = startY + i * lineHeight;
    if (y > 275) break;
    const row = i === 0 ? headers : (repartitions[i - 1] ? [
      String(i),
      repartitions[i - 1].date ? new Date(repartitions[i - 1].date).toLocaleDateString("fr-FR") : "",
      repartitions[i - 1].matiere?.label || "",
      repartitions[i - 1].classe?.label || "",
      repartitions[i - 1].lieuEcole?.label || "",
      repartitions[i - 1].statut || "",
    ] : ["", "", "", "", "", ""]);

    let x = marginLeft;
    row.forEach((cell, j) => {
      doc.text(String(cell), x, y);
      x += colWidths[j] || 15;
    });
  }

  doc.setFontSize(7);
  doc.text(`Total: ${repartitions.length} répartitions`, marginLeft, 285);

  const pdfBytes = doc.output("arraybuffer");
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"mes-repartitions.pdf\"",
    },
  });
}
