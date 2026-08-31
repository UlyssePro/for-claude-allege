import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserRole } from "@/lib/auth.actions";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const session = await getCurrentUser(sessionToken);

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      role: getUserRole(session.user),
      image: session.user.image,
    },
  });
}
