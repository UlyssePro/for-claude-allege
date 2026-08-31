import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const minutes = typeof body.minutes === "number" ? body.minutes : 30;

    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    const result = await prisma.user.updateMany({
      where: {
        logged: true,
        updatedAt: { lt: cutoff },
      },
      data: { logged: false },
    });

    return NextResponse.json({ success: true, cleaned: result.count });
  } catch (error) {
    console.error("cleanup error", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
