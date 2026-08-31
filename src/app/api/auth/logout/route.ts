import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/auth.actions";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ success: true });
  }

  const session = await prisma.authSession.findUnique({
    where: { token: sessionToken },
    select: { userId: true },
  });

  if (session?.userId) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { logged: false },
    });
  }

  await signOut(sessionToken);

  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth_session");
  return response;
}
