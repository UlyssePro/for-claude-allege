import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  const sortBy = request.nextUrl.searchParams.get("sortBy");
  const sortDir = request.nextUrl.searchParams.get("sortDir") || "asc";

  const orderBy: any[] = [];
  if (sortBy === "abrev") orderBy.push({ abrev: sortDir });
  else if (sortBy === "notes") orderBy.push({ _count: { notes: sortDir } });
  else orderBy.push({ label: sortDir });

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
    orderBy,
  });
  return NextResponse.json(matieres);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const matiere = await prisma.matiere.create({
    data: {
      label: body.label,
      abrev: body.abrev || undefined,
    },
  });
  return NextResponse.json(matiere, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const body = await request.json();
  const matiere = await prisma.matiere.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(matiere);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  await prisma.matiere.update({
    where: { id },
    data: { label: "" },
  });
  return NextResponse.json({ success: true });
}
