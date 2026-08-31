"use client";

import "@/styles/glass-dark-theme.css";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { SessionPinger } from "@/components/session-pinger";
import { Users, Film } from "lucide-react";
import { ChatWidget } from "@/components/chat-widget";
import { sidebarMenuItems } from "@/lib/sidebar-menu-items";

export default function EnseignantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [connectedCount, setConnectedCount] = useState(0);
  const [connectedStudents, setConnectedStudents] = useState<
    { id: string; name: string; classe: string }[]
  >([]);
  const [showPopup, setShowPopup] = useState(false);
  const [chatClasses, setChatClasses] = useState<
    { id: string; libelle: string }[]
  >([]);
  const [chatClasseId, setChatClasseId] = useState("");
  const [mediaNotifications, setMediaNotifications] = useState<
    { id: string; title: string; classeId: string; className?: string }[]
  >([]);
  const [sessionLabel, setSessionLabel] = useState<string>("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "prof")) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchConnected = async () => {
      try {
        const res = await fetch("/api/enseignant/connected-students", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setConnectedStudents(data.students || []);
          setConnectedCount(data.students?.length || 0);
        }
      } catch {
        // ignore
      }
    };

    fetchConnected();
    const interval = window.setInterval(fetchConnected, 5000);
    return () => window.clearInterval(interval);
  }, [sessionLabel]);

  useEffect(() => {
    let cancelled = false;

    const loadChatContext = async () => {
      try {
        const [classesRes, currentRes] = await Promise.all([
          fetch("/api/enseignant/chat/classes", { credentials: "include" }),
          fetch("/api/enseignant/chat/current", { credentials: "include" }),
        ]);

        if (!cancelled) {
          if (classesRes.ok) {
            const data = await classesRes.json();
            const classes = Array.isArray(data) ? data : [];
            setChatClasses(classes);

            if (currentRes.ok) {
              const currentData = await currentRes.json();
              const current = currentData?.current;
              if (
                current?.id &&
                classes.some((c: { id: string }) => c.id === current.id)
              ) {
                setChatClasseId(current.id);
              } else if (classes[0]?.id) {
                setChatClasseId(classes[0].id);
              }
            } else if (classes[0]?.id) {
              setChatClasseId(classes[0].id);
            }
          }
        }
      } catch {
        // ignore
      }
    };

    loadChatContext();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    fetch("/api/enseignant/me", { credentials: "include" })
      .then((res) => {
        console.log(
          "[/enseignant layout] /api/enseignant/me status",
          res.status,
        );
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        console.log("[/enseignant layout] /api/enseignant/me data", data);
        if (data?.enseignant?.sessionId) {
          return fetch(`/api/public/sessions`, { credentials: "include" })
            .then((res) => {
              console.log(
                "[/enseignant layout] /api/public/sessions status",
                res.status,
              );
              return res.ok ? res.json() : [];
            })
            .then((sessions) => {
              console.log("[/enseignant layout] sessions", sessions);
              const session = Array.isArray(sessions)
                ? sessions.find((s: any) => s.id === data.enseignant.sessionId)
                : null;
              console.log("[/enseignant layout] matched session", session);
              if (session?.label) {
                setSessionLabel(session.label);
              } else {
                setSessionLabel(data.enseignant.sessionId);
              }
            });
        }
      })
      .catch((err) => {
        console.log("[/enseignant layout] session fetch error", err);
      });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1488fc] mx-auto mb-4"></div>
          <p className="text-[rgb(156_163_175)]">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "prof") {
    return null;
  }

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      toast.success("Déconnexion réussie");
      router.push("/login");
    }
  };

  return (
    <div className="theme-bolt h-screen flex overflow-hidden bg-[#111114] text-[#f9f6f9]">
      {/* Header fixe */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#171719] border-b border-[#2c2c30] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#1488fc] flex items-center justify-center">
            <img src="/uploads/logos/app-logo.png" alt="Logo" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#f9f6f9]">HMS-GS Enseignant</span>
            <div className="h-6">
              {sessionLabel && (
                <span className="text-[10px] text-[#a4a3ac]">
                  Session : {sessionLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPopup((v) => !v)}
              className="relative flex items-center justify-center h-8 w-8 rounded-full bg-[#1e1e21] border border-[#2c2c30] text-[#a4a3ac] hover:text-[#f9f6f9] transition-colors"
            >
              <Users className="h-4 w-4" />
              {connectedCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-[#1488fc] px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {connectedCount}
                </span>
              )}
            </button>
            {showPopup && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-md border border-[#2c2c30] bg-[#171719] shadow-lg z-50">
                <div className="p-3 border-b border-[#2c2c30]">
                  <p className="text-xs font-medium text-[#f9f6f9]">
                    Élèves connectés ({connectedCount})
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                  {connectedStudents.length === 0 ? (
                    <p className="text-xs text-[#a4a3ac] p-2 text-center">
                      Aucun élève connecté
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {connectedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-[#1e1e21]"
                        >
                          <span className="text-xs text-[#f9f6f9]">
                            {student.name}
                          </span>
                          <span className="text-[10px] text-[#a4a3ac]">
                            {student.classe || "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Link
            href="/enseignant/medias"
            className="relative flex items-center justify-center h-8 w-8 rounded-full bg-[#1e1e21] border border-[#2c2c30] text-[#a4a3ac] hover:text-[#f9f6f9] transition-colors"
          >
            <Film className="h-4 w-4" />
            {mediaNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-[rgb(239_68_68)] px-1.5 py-0.5 text-[10px] font-medium text-white animate-pulse">
                {mediaNotifications.length}
              </span>
            )}
          </Link>
          <img
            src={
              user.image
                ? `/uploads/users/${user.image}`
                : "/uploads/users/default.png"
            }
            alt="Photo"
            className="h-8 w-8 rounded-full object-cover border border-[#2c2c30]"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/uploads/users/default.png";
            }}
          />
          <div className="flex flex-col items-start text-sm text-[#a4a3ac]">
            <span>Bienvenue,</span>
            <span className="text-[#83a509]">{user.username}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#1488fc] text-[#1488fc] hover:bg-[#1488fc]/10"
            onClick={handleLogout}
          >
            🚪 Déconnexion
          </Button>
        </div>
      </header>

      {/* Sidebar persistante */}
      <aside className="w-64 fixed top-14 bottom-0 overflow-y-auto p-4 space-y-2 border-r border-[#2c2c30] scrollbar-thin scrollbar-thumb-[#1488fc]/40 scrollbar-track-transparent scrollbar-thumb-rounded-full">
        <nav className="space-y-1 mt-2">
          {sidebarMenuItems
            .filter((item) => item.roles.includes(user.role as string))
            .sort((a, b) => a.num - b.num)
            .map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] transition-all ${
                      isActive
                        ? "bg-[#1488fc]/10 text-[#1488fc] border border-[#1488fc]"
                        : "text-[#a4a3ac] hover:bg-[#171719/0.6] hover:text-[#f9f6f9]"
                    }`}
                  >
                    <div className="text-lg w-6 text-center">{item.icon}</div>
                    {item.label}
                  </div>
                </Link>
              );
            })}
        </nav>
      </aside>

      {/* Content principal */}
      <main className="flex-1 ml-64 mt-14 h-[calc(100vh-56px)] overflow-y-hidden p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-[rgb(243_244_246)]">
              {sidebarMenuItems.find((i) => pathname === i.href)?.label ||
                "Dashboard"}
            </h1>
          </div>
          {children}
        </div>
      </main>
      <SessionPinger />
      <ChatWidget
        userId={user.id}
        userName={user.username}
        userRole="prof"
        classes={chatClasses}
        defaultClasseId={chatClasseId || chatClasses[0]?.id}
        userImage={user.image || null}
      />
    </div>
  );
}
