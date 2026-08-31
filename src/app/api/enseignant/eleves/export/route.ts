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
    select: { id: true, matiereId: true },
  });

  if (!enseignant) {
    return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
  }

  const classeId = request.nextUrl.searchParams.get("classeId");
  const genreId = request.nextUrl.searchParams.get("genreId");
  const format = request.nextUrl.searchParams.get("format") || "csv";

  const classeIds = await prisma.repartition.findMany({
    where: {
      enseignantId: enseignant.id,
      ...(enseignant.matiereId ? { matiereId: enseignant.matiereId } : {}),
    },
    select: { classeId: true },
    distinct: ["classeId"],
  });

  let ids = classeIds.map((r) => r.classeId).filter((id): id is string => !!id);

  if (classeId) {
    ids = ids.filter((id) => id === classeId);
  }

  const eleves = await prisma.eleve.findMany({
    where: {
      classeId: { in: ids },
      ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
      ...(genreId ? { genreId: genreId } : {}),
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      numero: true,
      contact: true,
      dob: true,
      classe: { select: { label: true } },
      genre: { select: { label: true, gen: true } },
    },
    orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
  });

  if (format === "pdf") {
    return generatePdf(eleves);
  }

  const headers = ["#", "Nom", "Prénom", "Classe", "N° classe", "Genre", "Contact"];
  const rows = eleves.map((e, i) => [
    i + 1,
    e.lastname || "",
    e.firstname || "",
    e.classe?.label || "-",
    e.numero || "-",
    e.genre?.label || "-",
    e.contact || "-",
  ]);

  const csv = [
    headers.join(";"),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");

  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"mes-eleves.csv\"",
    },
  });
}

async function generatePdf(eleves: any[]) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF("p", "mm", "a4");
  doc.setFontSize(14);
  doc.text("Ecole HMS", 14, 10);
  doc.setFontSize(10);
  doc.text(`Mes élèves (${new Date().toLocaleDateString("fr-FR")})`, 14, 16);

  const marginLeft = 14;
  const lineHeight = 5;
  const startY = 22;
  const colWidths = [10, 30, 30, 25, 20, 25, 30];
  const headers = ["#", "Nom", "Prénom", "Classe", "N°", "Genre", "Contact"];

  for (let i = 0; i < eleves.length + 1; i++) {
    const y = startY + i * lineHeight;
    if (y > 275) break;
    const row = i === 0 ? headers : (eleves[i - 1] ? [
      String(i),
      eleves[i - 1].lastname || "",
      eleves[i - 1].firstname || "",
      eleves[i - 1].classe?.label || "",
      eleves[i - 1].numero || "",
      eleves[i - 1].genre?.label || "",
      eleves[i - 1].contact || "",
    ] : ["", "", "", "", "", "", ""]);

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
      "Content-Disposition": "inline; filename=\"mes-eleves.pdf\"",
    },
  });
}
