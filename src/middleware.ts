import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/api/auth/login", "/api/auth/session", "/api/auth/logout", "/api/auth/forgot-password", "/api/auth/reset-password"];
const PUBLIC_PREFIXES = ["/uploads", "/_next/static", "/_next/image", "/favicon.ico"];

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("auth_session")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const res = await fetch(new URL(`/api/auth/verify`, request.url).toString(), {
      method: "GET",
      headers: {
        cookie: `auth_session=${sessionToken}`,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth_session");
      return response;
    }
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
