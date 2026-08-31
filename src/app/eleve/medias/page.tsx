"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomTable } from "@/components/ui/custom-table";
import { RowActions } from "@/components/ui/row-actions";
import { BroadcastModal } from "@/components/broadcast-modal";
import { Film, Play } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { io, Socket } from "socket.io-client";

interface MediaFile {
  title: string;
  url: string;
  type: string;
  size: number;
}

export default function EleveMediasPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [connected, setConnected] = useState(false);
  const [usualClasseId, setUsualClasseId] = useState<string>("");
  const socketRef = useRef<Socket | null>(null);

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

    socket.on("connect", () => {
      setConnected(true);
      console.log("[EleveMedias] Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("[EleveMedias] Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("[EleveMedias] Socket connection error:", error);
    });

    socket.on("media-uploaded", () => {
      console.log("[EleveMedias] Received media-uploaded");
      fetchMediaFiles();
    });

    socket.on("media-deleted", () => {
      console.log("[EleveMedias] Received media-deleted");
      fetchMediaFiles();
    });return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const loadClasse = async () => {
      try {
        const res = await fetch("/api/eleve/me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const classeId = data.classe?.usualClasseId || data.classe?.id || "";
          setUsualClasseId(classeId);
          if (classeId && socketRef.current) {
            socketRef.current.emit("subscribe-class", classeId);
            console.log("[EleveMedias] Subscribed to class:", classeId);
          }
        }
      } catch (error) {
        console.error("[EleveMedias] Failed to load classe:", error);
      }
    };

    loadClasse();
  }, []);

  useEffect(() => {
    const fetchMediaFiles = async () => {
      try {
        const res = await fetch("/api/fs-medias");
        const data = await res.json();
        if (Array.isArray(data.mediaFiles)) {
          setMediaFiles(data.mediaFiles);
        }
      } catch {
        // ignore
      }
    };

    fetchMediaFiles();
  }, []);

  const filteredMediaFiles = useMemo(() => {
    return mediaFiles.filter((media) => {
      const matchesSearch = media.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesType = !typeFilter || media.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [mediaFiles, search, typeFilter]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const columns = [
    {
      header: "Titre",
      accessor: (media: MediaFile) => (
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-[#1488fc]" />
          <span className="font-medium">{media.title}</span>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: (media: MediaFile) => (
        <Badge
          variant={
            media.type === "video"
              ? "default"
              : media.type === "audio"
                ? "secondary"
                : "outline"
          }
        >
          {media.type}
        </Badge>
      ),
    },
    {
      header: "Taille",
      accessor: (media: MediaFile) => formatSize(media.size),
    },
    {
      header: "Actions",
      accessor: (media: MediaFile) => (
        <RowActions
          actions={[
            {
              label: "Lire",
              onClick: () => setSelectedMedia(media),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-50">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Rechercher un média..."
          />
        </div>
        <div className="min-w-35">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous</SelectItem>
              <SelectItem value="video">Vidéo</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="file">Fichier</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!connected && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-sm text-[#a4a3ac]">
              Connexion au serveur en cours...
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <CustomTable data={filteredMediaFiles} columns={columns} />
        </CardContent>
      </Card>

      <BroadcastModal
        media={selectedMedia}
        open={!!selectedMedia}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMedia(null);
          }
        }}
        readOnly
        socket={socketRef.current}
      />
    </div>
  );
}




