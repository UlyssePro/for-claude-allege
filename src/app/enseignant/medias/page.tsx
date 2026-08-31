"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Film, Send, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SearchInput } from "@/components/ui/search-input";
import { AddButton } from "@/components/ui/add-button";
import { io, Socket } from "socket.io-client";
import { showConfirmToast } from "@/lib/toast.actions";

interface MediaFile {
  title: string;
  url: string;
  type: string;
  size: number;
}

interface UsualClasseRef {
  id: string;
  libelle: string;
}

export default function EnseignantMediasPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [classes, setClasses] = useState<UsualClasseRef[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBroadcastMedia, setSelectedBroadcastMedia] =
    useState<MediaFile | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [formData, setFormData] = useState({ type: "video" });
  const [broadcastClasseId, setBroadcastClasseId] = useState("");
  const [search, setSearch] = useState("");

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

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes/refs");
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data.types) ? data.types : []);
      }
    } catch {
      // ignore
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", uploadFile);
      uploadFormData.append("type", formData.type);

      if (detectedDuration !== null)
        uploadFormData.append("duration", String(detectedDuration));

      const res = await fetch("/api/fs-medias/upload", {
        method: "POST",
        body: uploadFormData,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Erreur lors de l'upload");
        return;
      }

      toast.success("Média uploadé avec succès");
      setDialogOpen(false);
      setUploadFile(null);
      setDetectedDuration(null);
      setFormData({ type: "video" });
      fetchMediaFiles();
      ensureSocket()?.emit("media-uploaded");
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchMediaFiles();
    fetchClasses();
  }, []);

  const ensureSocket = () => {
    if (!socketRef.current || !socketRef.current.connected) {
      const socket = io(
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
        {
          transports: ["websocket"],
        },
      );
      socketRef.current = socket;
      return socket;
    }
    return socketRef.current;
  };

  const broadcastMedia = async (media: MediaFile) => {
    setIsBroadcasting(true);
    try {
      const socket = ensureSocket();

      socket.once("connect", () => {
        const videoEl = document.querySelector<
          HTMLVideoElement | HTMLAudioElement
        >('video[src*="' + media.url + '"], audio[src*="' + media.url + '"]');
        const currentTime = videoEl?.currentTime || 0;

        socket.emit("broadcast-media", {
          mediaId: media.title,
          classeId: broadcastClasseId || media.url,
          title: media.title,
          url: media.url,
          type: media.type,
          thumbnailUrl: null,
          currentTime,
        });
        toast.success(`Média "${media.title}" diffusé à la classe`);
        setSelectedBroadcastMedia(media);
        setIsBroadcasting(false);
      });

      socket.once("connect_error", () => {
        toast.error("Erreur de connexion au serveur");
        setIsBroadcasting(false);
      });
    } catch {
      toast.error("Erreur lors de la diffusion");
      setIsBroadcasting(false);
    }
  };

  const detectMediaDuration = (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");

      if (!isVideo && !isAudio) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }

      const media = document.createElement(isVideo ? "video" : "audio");
      media.preload = "metadata";
      media.src = url;

      const onLoadedMetadata = () => {
        const duration = Number.isFinite(media.duration)
          ? Math.floor(media.duration)
          : null;
        URL.revokeObjectURL(url);
        resolve(duration);
      };

      const onError = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      media.addEventListener("loadedmetadata", onLoadedMetadata);
      media.addEventListener("error", onError);

      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(null);
      }, 10000);
    });
  };

  const sendMediaControl = async (
    action: "play" | "pause" | "seek" | "mute" | "unmute",
    currentTime?: number,
  ) => {
    if (!selectedBroadcastMedia) return;

    try {
      const socket = ensureSocket();

      socket.once("connect", () => {
        socket.emit("media-control", {
          classeId: broadcastClasseId || selectedBroadcastMedia.url,
          action,
          currentTime,
        });
      });
    } catch {
      // ignore
    }
  };

  const handleDeleteMedia = async (media: MediaFile) => {
    const confirmed = await showConfirmToast({
      title: "Supprimer ce média ?",
      description: `Le fichier "${media.title}" sera supprimé.`,
      destructive: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/fs-medias?name=${encodeURIComponent(media.url.split("/").pop() || "")}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Erreur lors de la suppression");
        return;
      }

      toast.success("Média supprimé");
      fetchMediaFiles();
      ensureSocket()?.emit("media-deleted");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredMediaFiles = useMemo(() => {
    return mediaFiles.filter((media) => {
      const matchesSearch = media.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesType = !formData.type || media.type === formData.type;
      return matchesSearch && matchesType;
    });
  }, [mediaFiles, search, formData.type]);

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
              label: "Diffuser",
              onClick: () => broadcastMedia(media),
              disabled: isBroadcasting || !broadcastClasseId,
            },
            {
              label: "Lire",
              onClick: () => broadcastMedia(media),
            },
            {
              label: "Supprimer",
              onClick: () => handleDeleteMedia(media),
              destructive: true,
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
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <AddButton onClick={() => setDialogOpen(true)}>Ajouter</AddButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajouter un média</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleUpload}>
              <div>
                <label className="text-xs text-[#a4a3ac] mb-1 block">
                  Fichier média
                </label>
                <Input
                  type="file"
                  accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setUploadFile(file);
                    if (file) {
                      const name = file.name.toLowerCase();
                      let type = "video";
                      if (
                        name.startsWith("audio") ||
                        name.endsWith(".mp3") ||
                        name.endsWith(".wav")
                      ) {
                        type = "audio";
                      } else if (
                        name.startsWith("image") ||
                        name.endsWith(".png") ||
                        name.endsWith(".jpg") ||
                        name.endsWith(".jpeg") ||
                        name.endsWith(".webp")
                      ) {
                        type = "image";
                      } else {
                        type = "file";
                      }
                      setFormData((prev) => ({ ...prev, type }));

                      detectMediaDuration(file).then((duration) => {
                        setDetectedDuration(duration);
                      });
                    }
                  }}
                />
              </div>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="file">Fichier</SelectItem>
                </SelectContent>
              </Select>
              {detectedDuration !== null && (
                <p className="text-xs text-[#a4a3ac]">
                  Durée détectée : {Math.floor(detectedDuration / 60)}:
                  {(detectedDuration % 60).toString().padStart(2, "0")}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={!uploadFile || uploading}>
                  {uploading ? "Upload..." : "Ajouter"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <BroadcastModal
        media={selectedBroadcastMedia}
        open={!!selectedBroadcastMedia}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBroadcastMedia(null);
            setIsBroadcasting(false);
          }
        }}
        onControl={sendMediaControl}
        socket={socketRef.current}
      />

      <Card>
        <CardContent>
          <CustomTable data={filteredMediaFiles} columns={columns} />
        </CardContent>
      </Card>
    </div>
  );
}
