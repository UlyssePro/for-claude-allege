import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserRole } from "@/lib/auth.actions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const session = await getCurrentUser(sessionToken);

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { logged: true, updatedAt: new Date() },
    });
  } catch {
    // ignore update failure
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      role: getUserRole(session.user),
      image: session.user.image,
      logged: true,
    },
  });
}
