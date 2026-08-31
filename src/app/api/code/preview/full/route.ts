import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth.actions";

function resolveLocalPath(basePath: string, ref: string): string | null {
  if (!basePath || !ref) return null;
  if (ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("//")) return null;
  if (ref.startsWith("/")) return null;

  const baseDir = basePath.includes("/") ? basePath.slice(0, basePath.lastIndexOf("/") + 1) : "/";
  const resolved = baseDir + ref.replace(/^\.\//, "");
  return resolved;
}

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

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
    }

    const file = await prisma.codeFile.findUnique({
      where: { path },
      select: { content: true, name: true, path: true },
    });

    if (!file) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    const isHtml = path.endsWith(".html") || path.endsWith(".htm");

    if (!isHtml) {
      return NextResponse.json({ content: file.content || "", name: file.name });
    }

    let html = file.content || "";

    try {
      const cssMatches = [...html.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
      const cssReplacements = new Map<string, string>();

      for (const match of cssMatches) {
        const href = match[1];
        const cssPath = resolveLocalPath(path, href);
        if (!cssPath || cssReplacements.has(match[0])) continue;

        const cssFile = await prisma.codeFile.findUnique({
          where: { path: cssPath },
          select: { content: true },
        });

        if (cssFile?.content) {
          cssReplacements.set(match[0], `<style>\n${cssFile.content}\n</style>`);
        }
      }

      const scriptMatches = [...html.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi)];
      const scriptReplacements = new Map<string, string>();

      for (const match of scriptMatches) {
        const src = match[1];
        const jsPath = resolveLocalPath(path, src);
        if (!jsPath || scriptReplacements.has(match[0])) continue;

        const jsFile = await prisma.codeFile.findUnique({
          where: { path: jsPath },
          select: { content: true },
        });

        if (jsFile?.content) {
          scriptReplacements.set(match[0], `<script>\n${jsFile.content}\n</script>`);
        }
      }

      for (const [original, replacement] of cssReplacements) {
        html = html.split(original).join(replacement);
      }

      for (const [original, replacement] of scriptReplacements) {
        html = html.split(original).join(replacement);
      }
    } catch {
      // fallback: return raw HTML if processing fails
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/code/preview/full error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
