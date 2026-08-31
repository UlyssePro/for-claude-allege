import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, normalizeRole } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const current = await getCurrentUser(sessionToken);
    if (!current || normalizeRole(current.user.role?.label) !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const adminSessionId = request.cookies.get("admin_session_id")?.value;

    const enseignants = await prisma.enseignant.findMany({
      where: adminSessionId ? { sessionId: adminSessionId } : {},
      select: {
        id: true,
        nom: true,
        prenom: true,
        handledById: true,
      },
      orderBy: { nom: "asc" },
    });

    const result = enseignants.map((e) => ({
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      hasUser: Boolean(e.handledById),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/enseignants error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
  }
}
