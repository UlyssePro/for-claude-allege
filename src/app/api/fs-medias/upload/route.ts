import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth.actions";
import { normalizeRole } from "@/lib/auth.actions";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = normalizeRole(session.user.role?.label);
    if (role !== "prof") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string | null)?.trim() || "video";

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "medias");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, bytes);

    const relativeUrl = `/uploads/medias/${fileName}`;

    return NextResponse.json({ url: relativeUrl, name: fileName, type });
  } catch (error) {
    console.error("POST /api/fs-medias/upload error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
