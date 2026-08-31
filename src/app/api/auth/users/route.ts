import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get("role");
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    const where: any = {};
    if (role) {
      const roleRecord = await prisma.role.findFirst({
        where: { label: role },
      });
      if (roleRecord) {
        where.roleId = roleRecord.id;
      }
    }
    if (sessionId) {
      where.sessionId = sessionId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
      },
      orderBy: {
        username: "asc",
      },
    });

    const seen = new Map<string, string>();
    const uniqueUsers = users.filter((u) => {
      const key = `${u.username.trim().toLowerCase()}|${(where.sessionId as string) || ""}`;
      if (seen.has(key)) return false;
      seen.set(key, u.id);
      return true;
    });

    return NextResponse.json(uniqueUsers);
  } catch (error) {
    console.error("GET /api/auth/users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
