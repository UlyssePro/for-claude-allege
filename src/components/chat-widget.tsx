"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, X, Smile, Trash2, Pencil } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface UsualClasse {
  id: string;
  libelle: string;
}

interface Message {
  id: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: string;
  userId: string;
  userImage: string | null;
}

interface ChatWidgetProps {
  userId: string;
  userName: string;
  userRole: "prof" | "eleve" | "admin";
  classes: UsualClasse[];
  defaultClasseId?: string;
  userImage?: string | null;
}

export function ChatWidget({
  userId,
  userName,
  userRole,
  classes,
  defaultClasseId,
  userImage,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [classeId, setClasseId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [textareaHeight, setTextareaHeight] = useState("auto");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingTextareaHeight, setEditingTextareaHeight] = useState("auto");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null,
  );
  const [connected, setConnected] = useState(false);
  const [localClasses, setLocalClasses] = useState<UsualClasse[]>(classes);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousClasseIdRef = useRef<string>("");
  const classeIdRef = useRef(classeId);
  const localClassesRef = useRef(localClasses);
  const userRoleRef = useRef(userRole);
  const isTeacherRef = useRef(userRole === "prof");
  const mountedRef = useRef(true);
  const loadAbortRef = useRef<AbortController | null>(null);
  const lastLoadedClasseIdRef = useRef<string>("");
  const messagesLoadedRef = useRef(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    classeIdRef.current = classeId;
  }, [classeId]);

  useEffect(() => {
    if (defaultClasseId && defaultClasseId !== classeId) {
      setClasseId(defaultClasseId);
    }
  }, [defaultClasseId]);

  useEffect(() => {
    if (!isOpen) return;
    justOpenedRef.current = true;
    if (classeId) {
      setClasseId("");
    }
    setTimeout(() => {
      justOpenedRef.current = false;
    }, 0);
  }, [isOpen]);

  useEffect(() => {
    if (justOpenedRef.current) return;
    if (classes.length > 0 && !classes.some((c) => c.id === classeId)) {
      setClasseId(classes[0].id);
    }
  }, [classes, classeId]);

  useEffect(() => {
    localClassesRef.current = localClasses;
  }, [localClasses]);

  useEffect(() => {
    userRoleRef.current = userRole;
    isTeacherRef.current = userRole === "prof";
  }, [userRole]);

  useEffect(() => {
    setLocalClasses(classes);
  }, [classes]);

  useEffect(() => {
    if (!isOpen) return;

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
      if (!mountedRef.current) return;
      console.log("[ChatWidget] Socket connected:", socket.id);
      setConnected(true);
      const currentClasseId = classeIdRef.current;
      if (currentClasseId) {
        socket.emit("join-chat", currentClasseId);
      }
      if (isTeacherRef.current) {
        const selectedClasse = localClassesRef.current.find(
          (c) => c.id === currentClasseId,
        );
        socket.emit("teacher-chat-class-changed", {
          classeId: currentClasseId,
          libelle: selectedClasse?.libelle || "",
        });
      }
    });

    socket.on("disconnect", () => {
      if (!mountedRef.current) return;
      console.log("[ChatWidget] Socket disconnected");
      setConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[ChatWidget] Socket connection error:", error);
    });

    socket.on("new-chat-message", (message: Message) => {
      if (!mountedRef.current) return;
      console.log("[ChatWidget] Received new message:", message);
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socket.on("new-media-broadcast", (data: { mediaId: string; classeId: string; title: string; url: string; type: string; thumbnailUrl?: string }) => {
      if (!mountedRef.current) return;
      console.log("[ChatWidget] Received new-media-broadcast:", data);
      if (userRoleRef.current === "eleve") {
        window.dispatchEvent(
          new CustomEvent("media-broadcast", { detail: data }),
        );
      }
    });

    socket.on(
      "teacher-chat-class-changed",
      (data: { classeId: string; libelle: string }) => {
        if (!mountedRef.current) return;
        console.log(
          "[ChatWidget] Received teacher-chat-class-changed:",
          data,
          "userRole:",
          userRoleRef.current,
        );
        if (userRoleRef.current === "eleve") {
          setLocalClasses((prev) => {
            const exists = prev.some((c) => c.id === data.classeId);
            if (!exists && data.libelle) {
              return [...prev, { id: data.classeId, libelle: data.libelle }];
            }
            return prev;
          });
          setClasseId(data.classeId);
        }
      },
    );

    return () => {
      console.log("[ChatWidget] Disconnecting socket");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const picker = emojiPickerRef.current;
      if (!picker || !target) return;
      const button =
        target instanceof Element
          ? target.closest('button[aria-label="Emoji picker"]')
          : null;
      if (!picker.contains(target) && !button) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!isOpen || !classeId) return;

    const socket = socketRef.current;

    if (
      previousClasseIdRef.current &&
      previousClasseIdRef.current !== classeId &&
      socket?.connected
    ) {
      socket.emit("leave-chat", previousClasseIdRef.current);
    }

    previousClasseIdRef.current = classeId;

    if (socket?.connected) {
      socket.emit("join-chat", classeId);
      if (isTeacherRef.current) {
        const selectedClasse = localClassesRef.current.find(
          (c) => c.id === classeId,
        );
        socket.emit("teacher-chat-class-changed", {
          classeId,
          libelle: selectedClasse?.libelle || "",
        });
      }
    }

    if (lastLoadedClasseIdRef.current === classeId) {
      return;
    }

    if (loadAbortRef.current) {
      loadAbortRef.current.abort();
    }
    const controller = new AbortController();
    loadAbortRef.current = controller;
    lastLoadedClasseIdRef.current = classeId;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/chat/messages?classeId=${encodeURIComponent(classeId)}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );
        if (!mountedRef.current) return;
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        } else {
          console.error("Failed to load chat messages", res.status);
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          console.error("Load chat messages error", e);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadMessages();
  }, [isOpen, classeId]);

  useEffect(() => {
    if (!isOpen || !isTeacherRef.current) return;

    const socket = socketRef.current;
    if (socket?.connected) {
      const selectedClasse = localClassesRef.current.find(
        (c) => c.id === classeIdRef.current,
      );
      socket.emit("teacher-chat-class-changed", {
        classeId: classeIdRef.current,
        libelle: selectedClasse?.libelle || "",
      });
    }
  }, [isOpen, localClasses]);

  useEffect(() => {
    messagesLoadedRef.current = false;
  }, [classeId]);

  useEffect(() => {
    if (!isOpen || !connected || !classeId || messagesLoadedRef.current) return;

    messagesLoadedRef.current = true;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/chat/messages?classeId=${encodeURIComponent(classeId)}`,
          {
            credentials: "include",
          },
        );
        if (!mountedRef.current) return;
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        } else {
          console.error("Failed to load chat messages", res.status);
        }
      } catch (e) {
        console.error("Load chat messages error", e);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadMessages();
  }, [isOpen, connected, classeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = document.getElementById(
      "chat-message-input",
    ) as HTMLTextAreaElement | null;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      setTextareaHeight(`${el.scrollHeight}px`);
    }
  }, [content]);

  useEffect(() => {
    const el = document.getElementById(
      "chat-message-edit-input",
    ) as HTMLTextAreaElement | null;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      setEditingTextareaHeight(`${el.scrollHeight}px`);
    }
  }, [editingContent]);

  useEffect(() => {
    if (!isOpen || !classeId || connected) return;

    const interval = window.setInterval(() => {
      const loadMessages = async () => {
        try {
          const res = await fetch(
            `/api/chat/messages?classeId=${encodeURIComponent(classeId)}`,
            {
              credentials: "include",
            },
          );
          if (!mountedRef.current) return;
          if (res.ok) {
            const data = await res.json();
            setMessages(data.messages || []);
          }
        } catch {
          // ignore
        }
      };

      loadMessages();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isOpen, classeId, connected]);

  const sendMessage = useCallback(async () => {
    if (!content.trim() || !classeId) {
      return;
    }

    const trimmed = content.trim();

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ classeId, content: trimmed }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "Erreur lors de l'envoi du message");
        return;
      }

      const data = await res.json();
      const savedMessage = data.message as Message;

      setMessages((prev) => {
        if (prev.some((m) => m.id === savedMessage.id)) {
          return prev;
        }
        return [...prev, savedMessage];
      });

      setContent("");

      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("send-chat-message", { ...savedMessage, classeId });
      }
    } catch {
      toast.error("Erreur lors de l'envoi du message");
    }
  }, [content, classeId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    setDeletingMessageId(messageId);
    try {
      const res = await fetch(
        `/api/chat/messages/${encodeURIComponent(messageId)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "Erreur lors de la suppression");
        return;
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingMessageId(null);
    }
  }, []);

  const startEditMessage = useCallback(
    (messageId: string, currentContent: string) => {
      setEditingMessageId(messageId);
      setEditingContent(currentContent);
    },
    [],
  );

  const saveEditMessage = useCallback(async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    try {
      const res = await fetch(
        `/api/chat/messages/${encodeURIComponent(editingMessageId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: editingContent.trim() }),
        },
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "Erreur lors de la modification");
        return;
      }

      const data = await res.json();
      const updated = data.message as Message;
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      setEditingMessageId(null);
      setEditingContent("");
      toast.success("Message modifié");
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }, [editingMessageId, editingContent]);

  const cancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent("");
    setEditingTextareaHeight("auto");
  }, []);

  const formatChatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `Aujourd'hui à ${time}`;
    if (isYesterday) return `Hier à ${time}`;
    return (
      d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) + ` à ${time}`
    );
  };

  const sanitizeMessageContent = (text: string) => {
    return text
      .replace(/<environment_details>[\s\S]*?<\/environment_details>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  };

  const selectedClasse = localClasses.find((c) => c.id === classeId);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center justify-center h-12 w-12 rounded-full bg-[#1488fc] text-white shadow-lg hover:bg-[#1488fc]/90 transition-colors cursor-pointer"
      >
        <Send className="h-5 w-5 rotate-360" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <div className="w-[340px] rounded-lg border border-[#2c2c30] bg-[#171719] shadow-xl flex flex-col h-[60vh]">
        <div className="flex items-center justify-between p-2 border-b border-[#2c2c30]">
          <div className="flex items-center gap-2">
            <img
              src={
                userImage
                  ? `/uploads/users/${userImage}`
                  : "/uploads/users/default.png"
              }
              alt={userName}
              className="h-8 w-8 rounded-full object-cover border border-[#2c2c30]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/uploads/users/default.png";
              }}
            />
            <div>
              {userRole === "prof" ? (
                <Select value={classeId} onValueChange={setClasseId}>
                  <SelectTrigger className="h-6 w-40 bg-[#1e1e21] border-[#2c2c30] text-[10px] text-[#a4a3ac]">
                    <SelectValue placeholder="Classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" disabled className="text-xs">
                      Sélectionner une classe...
                    </SelectItem>
                    {localClasses.map((uc) => (
                      <SelectItem key={uc.id} value={uc.id} className="text-xs">
                        {uc.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[10px] text-[#a4a3ac]">
                  {selectedClasse?.libelle || ""}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[#a4a3ac] hover:text-[#f9f6f9] transition-colors"
          >
            <X className="h-4 w-4 cursor-pointer" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 p-2 bg-[#1e1e21]">
          {!classeId ? (
            <p className="text-center text-xs text-[#a4a3ac] py-8">
              Sélectionnez une classe pour discuter.
            </p>
          ) : loading ? (
            <p className="text-center text-xs text-[#a4a3ac] py-8">
              Chargement...
            </p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-[#a4a3ac] py-8">
              Aucun message pour le moment.
            </p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.userId === userId;
              const isEditing = editingMessageId === msg.id;
              const avatarSrc = msg.userImage
                ? `/uploads/users/${msg.userImage}`
                : "/uploads/users/default.png";

              return (
                <div
                  key={msg.id}
                  className={`group flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                >
                  <img
                    src={avatarSrc}
                    alt={msg.userName}
                    className="h-8 w-8 rounded-full object-cover border border-[#2c2c30] shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/uploads/users/default.png";
                    }}
                  />
                  <div
                    className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}
                  >
                    {!isMine && (
                      <span className="text-[10px] text-[#a4a3ac] px-1">
                        {msg.userName} (
                        {msg.userRole === "prof"
                          ? "Prof"
                          : msg.userRole === "admin"
                            ? "Admin"
                            : "Élève"}
                        )
                      </span>
                    )}
                    <div
                      className={`relative w-full rounded-2xl px-3 py-2 text-xs ${
                        isMine
                          ? "bg-[#1488fc] text-white rounded-br-sm"
                          : msg.userRole === "prof"
                            ? "bg-[#1488fc]/20 text-[rgb(243_244_246)] rounded-bl-sm"
                            : msg.userRole === "admin"
                              ? "bg-[rgb(239_68_68)]/20 text-[rgb(243_244_246)] rounded-bl-sm"
                              : "bg-[rgb(55_65_81)] text-[rgb(243_244_246)] rounded-bl-sm"
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            id="chat-message-edit-input"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveEditMessage();
                              }
                              if (e.key === "Escape") {
                                cancelEditMessage();
                              }
                            }}
                            spellCheck={false}
                            rows={1}
                            style={{
                              height: editingTextareaHeight,
                              minHeight: "36px",
                              maxHeight: "160px",
                              resize: "none",
                              overflowY: "auto",
                            }}
                            className="bg-[#2c2c30] border border-[#3a3a3f] text-[rgb(243_244_246)] text-xs rounded-md px-3 py-2 outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={saveEditMessage}
                              className="h-6 px-2 text-[10px] bg-[#1488fc] hover:bg-[#1488fc]/90"
                            >
                              Enregistrer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditMessage}
                              className="h-6 px-2 text-[10px] border-[#2c2c30] text-[#a4a3ac] hover:text-[#f9f6f9]"
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {sanitizeMessageContent(msg.content)}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            <span className="text-[10px] text-[#a4a3ac] px-1">
                              {formatChatDate(msg.createdAt)}
                            </span>
                            {isMine && (
                              <>
                                <button
                                  type="button"
                                  disabled={deletingMessageId === msg.id}
                                    onClick={() =>
                                      startEditMessage(msg.id, sanitizeMessageContent(msg.content))
                                    }
                                  className="text-[10px] text-white/70 hover:text-white flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Modifier"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteMessage(msg.id)}
                                  disabled={deletingMessageId === msg.id}
                                  className="text-[10px] text-white/70 hover:text-white flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-2 border-t border-[#2c2c30] bg-[#171719]">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                disabled={!classeId}
                className="text-[#a4a3ac] hover:text-[#f9f6f9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Emoji picker"
              >
                <Smile className="h-4 w-4" />
              </button>
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-10 left-0 bg-[#1e1e21] border border-[#2c2c30] rounded-lg p-3 shadow-xl z-50 grid grid-cols-8 gap-2 w-72"
                >
                  {[
                    "😀",
                    "😂",
                    "😍",
                    "😎",
                    "😭",
                    "😡",
                    "👍",
                    "👎",
                    "🎉",
                    "🔥",
                    "❤️",
                    "👏",
                    "🤔",
                    "👀",
                    "🚀",
                    "💯",
                    "🙌",
                    "🤝",
                    "✅",
                    "❌",
                    "⭐",
                    "🌟",
                    "💪",
                    "🙏",
                    "🤣",
                    "😘",
                    "🥳",
                    "😇",
                    "🤗",
                    "🤩",
                    "😋",
                    "😴",
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setContent((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-base hover:bg-[#2c2c30] rounded p-1.5 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <textarea
              id="chat-message-input"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Écrire un message..."
              disabled={!classeId}
              className="w-full bg-[#1e1e21] border border-[#2c2c30] text-[rgb(243_244_246)] text-xs rounded-md px-3 py-2 outline-none"
              style={{
                height: textareaHeight,
                minHeight: "36px",
                maxHeight: "160px",
                resize: "none",
                overflowY: "auto",
              }}
              spellCheck={false}
              rows={1}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!content.trim() || !classeId}
              className="h-8 w-8 bg-[#1488fc] hover:bg-[#1488fc]/90"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
