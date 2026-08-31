import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search");
    const typeId = request.nextUrl.searchParams.get("typeId");
    const categorieId = request.nextUrl.searchParams.get("categorieId");
    const lieuId = request.nextUrl.searchParams.get("lieuId");
    const sortBy = request.nextUrl.searchParams.get("sortBy");
    const sortDir = request.nextUrl.searchParams.get("sortDir") || "asc";

    const orderBy: any[] = [];
    if (sortBy === "categorie") orderBy.push({ ClasseCategorie: { label: sortDir } });
    else if (sortBy === "eleves") orderBy.push({ _count: { eleves: sortDir } });
    else orderBy.push({ label: sortDir });

    const classes = await prisma.classe.findMany({
      where: {
        ...(search ? { label: { contains: search } } : {}),
        ...(categorieId ? { categorieId: categorieId } : {}),
        ...(lieuId ? { lieuId: lieuId } : {}),
      },
      select: {
        id: true,
        label: true,
        ClasseCategorie: { select: { label: true } },
        lieuEcole: { select: { label: true } },
        _count: { select: { eleves: true } },
      },
      orderBy,
    });

    return NextResponse.json(
      classes.map((c) => ({
        id: c.id,
        label: c.label,
        categorie: c.ClasseCategorie ? { label: c.ClasseCategorie.label } : null,
        lieu: c.lieuEcole ? { label: c.lieuEcole.label } : null,
        _count: { eleves: c._count.eleves },
      })),
    );
  } catch (e) {
    console.error("GET /api/classes error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const classe = await prisma.classe.create({
    data: {
      label: body.label,
      categorieId: body.categorieId || undefined,
      lieuId: body.lieuId || undefined,
    },
  });
  return NextResponse.json(classe, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const body = await request.json();
  const classe = await prisma.classe.update({
    where: { id },
    data: {
      label: body.label,
      categorieId: body.categorieId || undefined,
      lieuId: body.lieuId || undefined,
    },
  });
  return NextResponse.json(classe);
}


export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Identifiant requis" }, { status: 400 });
  }
  await prisma.classe.delete({
    where: { id },
  });
  return NextResponse.json({ success: true });
}
