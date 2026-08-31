"use client";

import { useEffect, useRef } from "react";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface UseExerciceRealtimeOptions {
  usualClasseId?: string;
  eleveId?: string;
  enseignantId?: string;
  onExerciceCreated?: () => void;
  onExerciceCorrige?: () => void;
  onExerciceTermine?: () => void;
  onExerciceDebloque?: () => void;
}

export function useExerciceRealtime(options: UseExerciceRealtimeOptions) {
  const {
    usualClasseId,
    eleveId,
    enseignantId,
    onExerciceCreated,
    onExerciceCorrige,
    onExerciceTermine,
    onExerciceDebloque,
  } = options;

  console.log("[useExerciceRealtime] init", { usualClasseId, eleveId, enseignantId });

  const socketRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const onExerciceCreatedRef = useRef(onExerciceCreated);
  const onExerciceCorrigeRef = useRef(onExerciceCorrige);
  const onExerciceTermineRef = useRef(onExerciceTermine);
  const onExerciceDebloqueRef = useRef(onExerciceDebloque);
  const subscribedRoomsRef = useRef<Set<string>>(new Set());
  const connectAttemptedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onExerciceCreatedRef.current = onExerciceCreated;
  }, [onExerciceCreated]);

  useEffect(() => {
    onExerciceCorrigeRef.current = onExerciceCorrige;
  }, [onExerciceCorrige]);

  useEffect(() => {
    onExerciceTermineRef.current = onExerciceTermine;
  }, [onExerciceTermine]);

  useEffect(() => {
    onExerciceDebloqueRef.current = onExerciceDebloque;
  }, [onExerciceDebloque]);

  useEffect(() => {
    if (connectAttemptedRef.current) return;
    connectAttemptedRef.current = true;

    let socket: any = null;
    let disposed = false;

    async function init() {
      try {
      const { io } = await import("socket.io-client");
      socket = io(SOCKET_URL, {
        transports: ["websocket"],
      });
      socketRef.current = socket;
      console.log("[useExerciceRealtime] socket created", socket.id);

        socket.on("connect", () => {
          console.log("[useExerciceRealtime] connected", socket.id);
        });

        socket.on("disconnect", () => {
          console.log("[useExerciceRealtime] disconnected");
          subscribedRoomsRef.current.clear();
        });

        socket.on("connect_error", (err: any) => {
          console.log("[useExerciceRealtime] connect_error", err?.message);
        });

        socket.on("exercice-created", () => {
          if (!mountedRef.current) return;
          onExerciceCreatedRef.current?.();
        });

        socket.on("exercice-corrige", () => {
          if (!mountedRef.current) return;
          onExerciceCorrigeRef.current?.();
        });

        socket.on("exercice-termine", () => {
          if (!mountedRef.current) return;
          onExerciceTermineRef.current?.();
        });

        socket.on("exercice-debloque", () => {
          if (!mountedRef.current) return;
          onExerciceDebloqueRef.current?.();
        });
      } catch (err) {
        console.log("[useExerciceRealtime] init error", err);
      }
    }

    init();

    return () => {
      disposed = true;
      if (socket) {
        try {
          socket.disconnect();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const desiredRooms = new Set<string>();
    if (usualClasseId) desiredRooms.add(`class:${usualClasseId}`);
    if (eleveId) desiredRooms.add(`eleve:${eleveId}`);
    if (enseignantId) desiredRooms.add(`enseignant:${enseignantId}`);

    const subscribe = () => {
      for (const room of desiredRooms) {
        if (!subscribedRoomsRef.current.has(room)) {
          const event =
            room.startsWith("class:")
              ? "subscribe-class"
              : room.startsWith("eleve")
                ? "subscribe-eleve"
                : "subscribe-enseignant";
          const id = room.split(":")[1];
          console.log("[useExerciceRealtime] subscribe", event, id);
          socket.emit(event, id);
          subscribedRoomsRef.current.add(room);
        }
      }

      for (const room of subscribedRoomsRef.current) {
        if (!desiredRooms.has(room)) {
          const event =
            room.startsWith("class:")
              ? "unsubscribe-class"
              : room.startsWith("eleve")
                ? "unsubscribe-eleve"
                : "unsubscribe-enseignant";
          const id = room.split(":")[1];
          console.log("[useExerciceRealtime] unsubscribe", event, id);
          socket.emit(event, id);
          subscribedRoomsRef.current.delete(room);
        }
      }
    };

    if (socket.connected) {
      subscribe();
    } else {
      const onConnect = () => {
        subscribe();
      };
      socket.once("connect", onConnect);
      return () => {
        socket.off("connect", onConnect);
      };
    }
  }, [usualClasseId, eleveId, enseignantId]);

  return { connected: !!socketRef.current?.connected };
}
