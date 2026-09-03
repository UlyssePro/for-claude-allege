import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth.actions";
import { normalizeRole } from "@/lib/auth.actions";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    if (!name) {
      return NextResponse.json({ error: "Nom de fichier requis" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "uploads", "medias", name);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }

    await unlink(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/fs-medias error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
