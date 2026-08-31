import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth.actions";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await getCurrentUser(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { code, language, fileName } = body;

    if (!code) {
      return NextResponse.json({ error: "Code requis" }, { status: 400 });
    }

    let output = "";
    let error = "";

    try {
      if (language === "javascript" || language === "js" || language === "jsx" || language === "typescript" || language === "ts" || language === "tsx") {
        const logs: string[] = [];
        const customConsole = {
          log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
          error: (...args: unknown[]) => logs.push("ERROR: " + args.map(String).join(" ")),
          warn: (...args: unknown[]) => logs.push("WARN: " + args.map(String).join(" ")),
        };

        const fn = new Function("console", code);
        fn(customConsole);
        output = logs.join("\n") || "Exécuté avec succès (aucune sortie)";
      } else if (language === "html") {
        output = "Fichier HTML prêt. Ouvrez-le dans un navigateur pour le visualiser.";
      } else if (language === "css") {
        output = "Fichier CSS prêt. Appliquez-le à un document HTML.";
      } else if (language === "python" || language === "py") {
        output = "L'exécution Python nécessite un serveur backend dédié. Simulation terminée.";
      } else if (language === "php") {
        output = "L'exécution PHP nécessite un serveur backend dédié. Simulation terminée.";
      } else if (language === "json") {
        try {
          JSON.parse(code);
          output = "JSON valide";
        } catch (e) {
          error = "JSON invalide: " + (e instanceof Error ? e.message : String(e));
        }
      } else {
        output = "Exécution simulée pour le langage: " + language;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
      success: !error,
      output: error || output,
      fileName,
    });
  } catch (error) {
    console.error("POST /api/code/execute error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
