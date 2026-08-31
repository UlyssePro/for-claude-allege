"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Play, Pause, Volume2, VolumeX, Maximize, Radio } from "lucide-react";
import { Socket } from "socket.io-client";

interface Media {
  id?: string;
  title?: string;
  description?: string | null;
  type: string;
  url: string;
  thumbnailUrl?: string | null;
  classeId?: string;
  enseignantId?: string;
  isLive?: boolean;
  isActive?: boolean;
  duration?: number | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  currentTime?: number;
}

interface BroadcastModalProps {
  media: Media | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  onControl?: (action: "play" | "pause" | "seek" | "mute" | "unmute", currentTime?: number) => void;
  socket?: Socket | null;
}

export function BroadcastModal({ media, open, onOpenChange, readOnly = false, onControl, socket }: BroadcastModalProps) {
  const videoRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (!media) {
      setTextContent(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setIsMuted(false);
      return;
    }

    if (media.type === "file" && media.url.endsWith(".txt")) {
      setLoadingText(true);
      fetch(media.url)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch(() => {
          setTextContent("Erreur lors du chargement du fichier");
          setLoadingText(false);
        });
    } else {
      setTextContent(null);
    }
  }, [media]);

  useEffect(() => {
    if (!media || !videoRef.current) return;

    const el = videoRef.current;

    const handleLoadedMetadata = () => {
      setDuration(el.duration);
      if (typeof media.currentTime === "number") {
        el.currentTime = media.currentTime;
        setCurrentTime(media.currentTime);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(el.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("ended", handleEnded);

    return () => {
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("ended", handleEnded);
    };
  }, [media]);

  useEffect(() => {
    if (!readOnly || !socket || !open) return;

    const handleMediaControl = (data: {
      classeId: string;
      action: "play" | "pause" | "seek" | "mute" | "unmute";
      currentTime?: number;
    }) => {
      if (!videoRef.current) return;

      if (data.action === "play") {
        videoRef.current.play();
        setIsPlaying(true);
      } else if (data.action === "pause") {
        videoRef.current.pause();
        setIsPlaying(false);
      } else if (data.action === "seek" && data.currentTime !== undefined) {
        videoRef.current.currentTime = data.currentTime;
        setCurrentTime(data.currentTime);
      } else if (data.action === "mute") {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else if (data.action === "unmute") {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    };

    const handleMediaSync = (data: {
      classeId: string;
      currentTime: number;
      isPlaying: boolean;
    }) => {
      if (!videoRef.current) return;

      const diff = Math.abs(videoRef.current.currentTime - data.currentTime);
      if (diff > 1.5) {
        videoRef.current.currentTime = data.currentTime;
        setCurrentTime(data.currentTime);
      }

      if (data.isPlaying && videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else if (!data.isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    socket.on("media-control", handleMediaControl);
    socket.on("media-sync", handleMediaSync);

    return () => {
      socket.off("media-control", handleMediaControl);
      socket.off("media-sync", handleMediaSync);
    };
  }, [readOnly, socket, open]);

  useEffect(() => {
    if (readOnly || !socket || !open || !media) return;

    const interval = window.setInterval(() => {
      if (!videoRef.current || !socket.connected) return;
      socket.emit("media-sync", {
        classeId: media.classeId || "",
        currentTime: videoRef.current.currentTime || 0,
        isPlaying: !videoRef.current.paused,
      });
    }, 2000);

    return () => window.clearInterval(interval);
  }, [readOnly, socket, open, media]);

  const togglePlay = () => {
    if (!videoRef.current || readOnly) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
    onControl?.(isPlaying ? "pause" : "play", videoRef.current.currentTime);
  };

  const toggleMute = () => {
    if (!videoRef.current || readOnly) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    onControl?.(isMuted ? "unmute" : "mute", videoRef.current.currentTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || readOnly) return;
    const time = Number(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    onControl?.("seek", time);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const isVideo = media?.type === "video";
  const isAudio = media?.type === "audio";
  const isImage = media?.type === "image";
  const isFile = media?.type === "file";
  const isPdf = isFile && media?.url.toLowerCase().endsWith(".pdf");
  const isTxt = isFile && media?.url.toLowerCase().endsWith(".txt");
  const isDoc = isFile && /\.(doc|docx)$/i.test(media?.url || "");
  const isExcel = isFile && /\.(xls|xlsx)$/i.test(media?.url || "");

  if (!media) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-none w-[calc(100%-2rem)] h-[calc(100%-2rem)] max-w-none max-h-none top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-[#2c2c30] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radio className="h-5 w-5 text-[rgb(239_68_68)]" />
              <DialogTitle className="flex items-center gap-2">
                {readOnly ? "Diffusion en direct" : "Diffusion en cours"}
                <Badge variant="destructive" className="animate-pulse">
                  LIVE
                </Badge>
              </DialogTitle>
            </div>
            {readOnly && (
              <span className="text-xs text-[#a4a3ac]">En lecture seule</span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-black flex items-center justify-center relative">
          {isVideo && (
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              src={media.url}
              poster={media.thumbnailUrl || undefined}
              className="w-full h-full object-contain"
              controls={!readOnly}
              autoPlay
            />
          )}

          {isAudio && (
            <div className="flex flex-col items-center justify-center w-full h-full gap-6">
              <div className="w-32 h-32 rounded-full bg-[#1e1e21] flex items-center justify-center">
                <Radio className="h-16 w-16 text-[#1488fc]" />
              </div>
              <audio
                ref={videoRef as React.RefObject<HTMLAudioElement>}
                src={media.url}
                className="w-full max-w-2xl"
                controls={!readOnly}
                autoPlay
              />
            </div>
          )}

          {isImage && (
            <img
              src={media.url}
              alt={media.title}
              className="w-full h-full object-contain"
            />
          )}

          {isFile && isTxt && (
            <div className="w-full h-full overflow-auto p-6 bg-[#111114]">
              {loadingText ? (
                <p className="text-[#a4a3ac] text-center">Chargement du fichier...</p>
              ) : textContent !== null ? (
                <pre className="text-sm text-[#f9f6f9] whitespace-pre-wrap font-mono">
                  {textContent}
                </pre>
              ) : (
                <p className="text-[#a4a3ac] text-center">Impossible de charger le fichier</p>
              )}
            </div>
          )}

          {isFile && isPdf && (
            <iframe
              src={media.url}
              className="w-full h-full border-0"
              title={media.title}
            />
          )}

          {isFile && (isDoc || isExcel) && (
            <div className="flex flex-col items-center justify-center gap-4 p-6">
              <p className="text-[#a4a3ac] text-center">
                Ce type de fichier ne peut pas être affiché directement dans le navigateur.
              </p>
              <Button asChild>
                <a href={media.url} download target="_blank" rel="noopener noreferrer">
                  Télécharger le fichier
                </a>
              </Button>
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin + media.url : media.url)}`}
                className="w-full h-[70vh] border-0 rounded-lg"
                title={media.title}
              />
            </div>
          )}

          {isFile && !isPdf && !isTxt && !isDoc && !isExcel && (
            <div className="flex flex-col items-center justify-center gap-4 p-6">
              <p className="text-[#a4a3ac] text-center">
                Ce type de fichier ne peut pas être affiché directement.
              </p>
              <Button asChild>
                <a href={media.url} download target="_blank" rel="noopener noreferrer">
                  Télécharger le fichier
                </a>
              </Button>
            </div>
          )}
        </div>

        {!readOnly && (isVideo || isAudio) && (
          <div className="px-6 py-4 border-t border-[#2c2c30] flex-shrink-0 bg-[#171719]">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={togglePlay}
                className="h-8 w-8 p-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={toggleMute}
                className="h-8 w-8 p-0"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.requestFullscreen?.();
                  }
                }}
                className="h-8 w-8 p-0"
              >
                <Maximize className="h-4 w-4" />
              </Button>
              <span className="text-xs text-[#a4a3ac] ml-auto">
                {formatTime(currentTime)} / {formatTime(duration || media.duration || 0)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || media.duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-[#2c2c30] rounded-lg appearance-none cursor-pointer accent-[#1488fc] mt-3"
            />
          </div>
        )}

        {!readOnly && (
          <div className="px-6 py-4 border-t border-[#2c2c30] flex-shrink-0 bg-[#171719] flex justify-between items-center">
            <span className="text-xs text-[#a4a3ac]">Les élèves voient ce média en direct</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onOpenChange(false)}
            >
              Arrêter la diffusion
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
