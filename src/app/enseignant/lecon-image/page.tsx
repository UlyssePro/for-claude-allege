"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/ui/custom-table";
import { RowActions } from "@/components/ui/row-actions";
import { Play } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { io, Socket } from "socket.io-client";

interface ImageItem {
  name: string;
  url: string;
}

interface Row extends ImageItem {
  index: number;
  category: string;
}

interface ClasseRef {
  id: string;
  libelle: string;
}

export default function LeconImagePage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerImage, setViewerImage] = useState<ImageItem | null>(null);
  const [zoom, setZoom] = useState(100);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [classes, setClasses] = useState<ClasseRef[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch("/api/lecon-images");
        const data = await res.json();
        setImages(data.images || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/classes/refs");
        if (res.ok) {
          const data = await res.json();
          setClasses(data.types || []);
        }
      } catch {
        // ignore
      }
    };

    fetchImages();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!viewerImage) {
      setZoom(100);
    }
  }, [viewerImage]);

  const rows = useMemo<Row[]>(() => {
    return images
      .map((img, idx) => {
        const parts = img.name.split("-");
        const category = parts.length > 1 ? parts[1] : "Autre";
        return { ...img, index: idx + 1, category };
      })
      .filter((row) => {
        const matchesSearch = row.name
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesCategory =
          category === "all" || row.category === category;
        return matchesSearch && matchesCategory;
      });
  }, [images, search, category]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    images.forEach((img) => {
      const parts = img.name.split("-");
      if (parts.length > 1) cats.add(parts[1]);
    });
    return Array.from(cats).sort();
  }, [images]);

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const resetZoom = () => setZoom(100);

  const broadcastImage = async (img: ImageItem) => {
    if (!selectedClasseId) {
      return;
    }

    setBroadcasting(true);
    try {
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

      socket.once("connect", () => {
        console.log("[ProfLeconImage] Socket connected, broadcasting to classe:", selectedClasseId, img.name);
        socket.emit("broadcast-lecon-image", {
          classeId: selectedClasseId,
          url: img.url,
          name: img.name,
        });
        setViewerImage(img);
        setBroadcasting(false);
      });

      socket.once("connect_error", () => {
        setBroadcasting(false);
      });
    } catch {
      setBroadcasting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-50">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            onClear={() => setSearch("")}
          />
        </div>
        <div className="min-w-35">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-35">
          <Select value={selectedClasseId} onValueChange={setSelectedClasseId}>
            <SelectTrigger>
              <SelectValue placeholder="Classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sélectionner une classe</SelectItem>
              {classes.map((classe) => (
                <SelectItem key={classe.id} value={classe.id}>
                  {classe.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 overflow-hidden p-0">
          <CustomTable
            columns={[
              {
                header: "#",
                accessor: (row) => (
                  <span className="text-[rgb(243_244_246)] text-center">
                    {(row as any).index}
                  </span>
                ),
                width: "60px",
                className: "text-center",
              },
              {
                header: "Image",
                accessor: (img) => (
                  <span className="text-[rgb(243_244_246)]">{img.name}</span>
                ),
              },
              {
                header: "Actions",
                accessor: (img) => (
                  <RowActions
                    actions={[
                      {
                        label: "Diffuser",
                        onClick: () => broadcastImage(img),
                        disabled: !selectedClasseId || broadcasting,
                      },
                    ]}
                  />
                ),
                className: "text-right",
                width: "80px",
              },
            ]}
            data={rows}
          />
        </CardContent>
      </Card>

      {viewerImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => {
            setViewerImage(null);
            const targetClasseId = selectedClasseId;
            const socket = socketRef.current;
            if (socket) {
              const emitStop = () => {
                console.log("[ProfLeconImage] Emitting stop-lecon-image to", targetClasseId, "connected:", socket.connected);
                socket.emit("stop-lecon-image", {
                  classeId: targetClasseId,
                });
              };

              if (socket.connected) {
                emitStop();
              } else {
                socket.once("connect", () => emitStop());
                socket.connect();
              }
              socket.disconnect();
              socketRef.current = null;
            }
          }}
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
              onClick={() => {
                setViewerImage(null);
                const targetClasseId = selectedClasseId;
                const socket = socketRef.current;
                if (socket) {
                  const emitStop = () => {
                    console.log("[ProfLeconImage] Emitting stop-lecon-image to", targetClasseId, "connected:", socket.connected);
                    socket.emit("stop-lecon-image", {
                      classeId: targetClasseId,
                    });
                  };

                  if (socket.connected) {
                    emitStop();
                  } else {
                    socket.once("connect", () => emitStop());
                    socket.connect();
                  }
                  socket.disconnect();
                  socketRef.current = null;
                }
              }}
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
