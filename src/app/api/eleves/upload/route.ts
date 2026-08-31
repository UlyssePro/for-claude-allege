import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const formData = await request.formData();
  const file = formData.get("photo") as File | null;
  if (!file || !file.name) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  const uploadDir = join(process.cwd(), "public", "uploads", "eleves");
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase();
  const fileName = `${id}.${ext}`;

  const buffer = await file.arrayBuffer();
  writeFileSync(join(uploadDir, fileName), Buffer.from(buffer));

  await prisma.eleve.update({
    where: { id },
    data: { photo: fileName },
  });

  return NextResponse.json({ photo: fileName });
}
