import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";
import { normalizeRole } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        logged: true,
        ...(session.user.sessionId ? { sessionId: session.user.sessionId } : {}),
      },
      include: {
        role: { select: { label: true } },
        elevesHandled: {
          include: { classe: { select: { label: true } } },
        },
      },
    });

    const students = users
      .filter((u) => normalizeRole(u.role?.label ?? null) === "eleve")
      .map((u) => ({
        id: u.id,
        name: u.username,
        classe: u.elevesHandled?.[0]?.classe?.label || "",
      }));

    return NextResponse.json({ students });
  } catch (error) {
    console.error("GET /api/enseignant/connected-students error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
