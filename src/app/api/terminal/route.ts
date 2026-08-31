declare global {
  var __terminalEmit: ((sessionId: string, payload: { sessionId: string; data: string; type: string }) => void) | undefined;
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth.actions";
import { spawn } from "child_process";
import path from "path";

const sessions = new Map<string, { process: any; cwd: string }>();

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
    const { command, sessionId, cwd } = body as {
      command?: string;
      sessionId?: string;
      cwd?: string;
    };

    if (!command && !sessionId) {
      return NextResponse.json({ error: "Commande ou session requis" }, { status: 400 });
    }

    const userSessionId = sessionId || `${session.user.id}-${Date.now()}`;

    if (command === "__init__") {
      const shell = process.platform === "win32" ? "cmd.exe" : "bash";
      const defaultCwd = cwd || process.cwd();
      const child = spawn(shell, [], {
        cwd: defaultCwd,
        shell: false,
        env: { ...process.env, TERM: "xterm-256color" },
      });

      sessions.set(userSessionId, { process: child, cwd: defaultCwd });

      child.stdout.on("data", (data: Buffer) => {
        const payload = { sessionId: userSessionId, data: data.toString("utf-8"), type: "stdout" };
        globalThis.__terminalEmit?.(userSessionId, payload);
      });

      child.stderr.on("data", (data: Buffer) => {
        const payload = { sessionId: userSessionId, data: data.toString("utf-8"), type: "stderr" };
        globalThis.__terminalEmit?.(userSessionId, payload);
      });

      child.on("exit", () => {
        sessions.delete(userSessionId);
        globalThis.__terminalEmit?.(userSessionId, { sessionId: userSessionId, data: "", type: "exit" });
      });

      return NextResponse.json({ sessionId: userSessionId, cwd: defaultCwd });
    }

    if (command === "__resize__") {
      return NextResponse.json({ ok: true });
    }

    if (command === "__cwd__") {
      const entry = sessions.get(userSessionId);
      return NextResponse.json({ cwd: entry?.cwd || process.cwd() });
    }

    const entry = sessions.get(userSessionId);
    if (!entry) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    const shellProcess = entry.process;
    if (shellProcess.killed) {
      sessions.delete(userSessionId);
      return NextResponse.json({ error: "Session terminée" }, { status: 410 });
    }

    shellProcess.stdin.write(command + "\n");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/terminal error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    const entry = sessions.get(sessionId);
    if (entry) {
      try {
        entry.process.kill();
      } catch {
        // ignore
      }
      sessions.delete(sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/terminal error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
