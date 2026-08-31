import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const profId = request.nextUrl.searchParams.get("profId");

  if (!profId) {
    return NextResponse.json({ error: "profId requis" }, { status: 400 });
  }

  const notes = await prisma.note.findMany({
    where: { profId },
    select: {
      id: true,
      note1: true,
      note2: true,
      note3: true,
      note4: true,
      note5: true,
      eleve: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          numero: true,
          classe: { select: { label: true } },
        },
      },
      matiere: {
        select: { label: true },
      },
    },
    orderBy: [{ eleve: { lastname: "asc" } }, { eleve: { firstname: "asc" } }],
  });

  return NextResponse.json(notes);
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const body = await request.json();
  const update: Record<string, unknown> = {};
  for (const key of ["note1", "note2", "note3", "note4", "note5"]) {
    if (key in body && body[key] !== null && body[key] !== undefined) {
      update[key] = Number(body[key]);
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune donnée" }, { status: 400 });
  }

  const note = await prisma.note.update({
    where: { id },
    data: update,
  });

  return NextResponse.json(note);
}
