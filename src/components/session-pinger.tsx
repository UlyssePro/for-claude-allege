"use client";

import { useEffect } from "react";

export function SessionPinger() {
  useEffect(() => {
    const ping = async () => {
      try {
        await fetch("/api/auth/session", { method: "GET", credentials: "include" });
      } catch {
        // ignore
      }
    };

    ping();
    const interval = window.setInterval(ping, 30 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
