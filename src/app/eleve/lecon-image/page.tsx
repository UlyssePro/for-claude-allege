"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface ImageItem {
  name: string;
  url: string;
}

export default function LeconImagePage() {
  const [viewerImage, setViewerImage] = useState<ImageItem | null>(null);
  const [zoom, setZoom] = useState(100);
  const [subscribed, setSubscribed] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!viewerImage) {
      setZoom(100);
    }
  }, [viewerImage]);

  useEffect(() => {
    const getSocketUrl = () => {
      if (typeof window !== "undefined") {
        const host = window.location.hostname;
        const protocol =
          window.location.protocol === "https:" ? "https:" : "http:";
        return `${protocol}//${host}:3001`;
      }
      return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    };

    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", async () => {
      try {
        const res = await fetch("/api/eleve/me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const classeId = data.classe?.usualClasseId || data.classe?.id || "";
          console.log("[EleveLeconImage] Subscribing to classeId:", classeId, data.classe);
          if (classeId) {
            socket.emit("subscribe-class", classeId);
            setSubscribed(true);
          }
        }
      } catch {
        // ignore
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[EleveLeconImage] Socket disconnected:", reason);
      setSubscribed(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[EleveLeconImage] Socket connection error:", error);
      setSubscribed(false);
    });

    socket.on(
      "new-lecon-image",
      (data: { classeId: string; url: string; name: string }) => {
        console.log("[EleveLeconImage] Received new-lecon-image:", data);
        setViewerImage({ url: data.url, name: data.name });
      },
    );

    socket.on("stop-lecon-image", () => {
      console.log("[EleveLeconImage] Received stop-lecon-image");
      setViewerImage(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const resetZoom = () => setZoom(100);

  return (
    <div>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Leçon en image</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="flex flex-col items-center justify-center h-full text-[rgb(156_163_175)] gap-2">
            <Play className="h-12 w-12 opacity-40" />
            <p>En attente de la leçon...</p>
            {subscribed && (
              <p className="text-xs">Connecté au flux de la classe</p>
            )}
          </div>
        </CardContent>
      </Card>

      {viewerImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setViewerImage(null)}
        >
          <div
            className="absolute top-4 right-4 z-10 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="secondary" size="sm" onClick={zoomOut}>
              -
            </Button>
            <button
              onClick={resetZoom}
              className="rounded bg-white/10 hover:bg-white/20 text-white px-2 py-1 text-xs cursor-pointer min-w-[60px] text-center"
            >
              {zoom}%
            </button>
            <Button variant="secondary" size="sm" onClick={zoomIn}>
              +
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewerImage(null)}
            >
              ✕
            </Button>
          </div>
          <div className="overflow-auto max-w-full max-h-full p-8">
            <img
              src={viewerImage.url}
              alt={viewerImage.name}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "center center",
                transition: "transform 0.15s ease",
              }}
              className="max-w-none max-h-none object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
