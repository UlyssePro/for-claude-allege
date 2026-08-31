"use client";

import { useEffect, useRef, useState } from "react";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export function useQuizActivation(usualClasseId: string) {
  const [enabled, setEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const usualClasseIdRef = useRef(usualClasseId);
  const previousClassIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    usualClasseIdRef.current = usualClasseId;
  }, [usualClasseId]);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const url = usualClasseId
          ? `/api/eleve/quiz/activation?usualClasseId=${encodeURIComponent(usualClasseId)}`
          : "/api/eleve/quiz/activation";
        const res = await fetch(url, { credentials: "include" });
        if (res.ok && mountedRef.current) {
          const data = await res.json();
          if (typeof data.enabled === "boolean") {
            setEnabled(data.enabled);
          }
        }
      } catch {
        // ignore
      }
    };

    fetchInitial();
  }, [usualClasseId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const current = usualClasseIdRef.current;
    const previous = previousClassIdRef.current;

    if (previous && previous !== current && socket.connected) {
      socket.leave(`class:${previous}`);
      console.log("Unsubscribed from class:", previous);
    }

    const subscribe = () => {
      const c = usualClasseIdRef.current;
      if (!c) return;
      socket.emit("subscribe-class", c);
      previousClassIdRef.current = c;
      console.log("Subscribed to class:", c);
    };

    if (socket.connected) {
      subscribe();
    } else {
      socket.once("connect", subscribe);
    }

    return () => {
      socket.off("connect", subscribe);
    };
  }, [usualClasseId]);

  useEffect(() => {
    let socket: any = null;

    const connect = async () => {
      try {
        const { io } = await import("socket.io-client");
        socket = io(SOCKET_URL, {
          transports: ["websocket"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("WS connected", socket.id);
          if (!mountedRef.current) return;
          setConnected(true);
          if (usualClasseIdRef.current) {
            console.log("Subscribing to class:", usualClasseIdRef.current);
            socket.emit("subscribe-class", usualClasseIdRef.current);
          }
        });

        socket.on("disconnect", () => {
          console.log("WS disconnected");
          if (!mountedRef.current) return;
          setConnected(false);
        });

        socket.on("quiz-activation-changed", (data: { usualClasseId: string; enabled: boolean }) => {
          console.log("WS activation changed", data);
          if (!mountedRef.current) return;
          if (data.usualClasseId === usualClasseIdRef.current) {
            setEnabled(data.enabled);
          }
        });
      } catch (error) {
        console.error("WebSocket connection failed:", error);
      }
    };

    connect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return { enabled, connected };
}
