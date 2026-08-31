"use client";

import "@/styles/glass-dark-theme.css";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/use-auth";
import { SessionPinger } from "@/components/session-pinger";
import { useQuizActivation } from "@/hooks/use-quiz-activation";
import { ChatWidget } from "@/components/chat-widget";
import { Film } from "lucide-react";
import { sidebarMenuItems } from "@/lib/sidebar-menu-items";

export default function EleveLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [classeLabel, setClasseLabel] = useState<string>("");
  const [usualClasseId, setUsualClasseId] = useState<string>("");
  const [sessionLabel, setSessionLabel] = useState<string>("");
  const [chatClasses, setChatClasses] = useState<
    { id: string; libelle: string }[]
  >([]);
  const [chatClasseId, setChatClasseId] = useState("");
  const [mediaNotifications, setMediaNotifications] = useState<
    { mediaId: string; title: string; classeId: string }[]
  >([]);
  const { enabled: quizEnabled, connected: wsConnected } =
    useQuizActivation(usualClasseId);

  useEffect(() => {
    if (!user || user.role !== "eleve") return;
    let cancelled = false;
    const load = async () => {
      try {
        const [meRes, actRes] = await Promise.all([
          fetch("/api/eleve/me"),
          fetch("/api/eleve/quiz/activation"),
        ]);
        if (meRes.ok) {
          const data = await meRes.json();
          if (!cancelled) {
            const classeLabel = data.classe?.label || "";
            const usualClasseId = data.classe?.usualClasseId || "";
            setClasseLabel(classeLabel);
            setUsualClasseId(usualClasseId);
            setSessionLabel(data.session?.label || "");
            if (data.classe?.id && data.classe?.label) {
              setChatClasses([
                { id: data.classe.id, libelle: data.classe.label },
              ]);
              setChatClasseId(data.classe.id);
            } else {
              setChatClasses([]);
              setChatClasseId("");
            }
          }
        } else {
          setChatClasses([]);
          setChatClasseId("");
        }
        if (actRes.ok) {
          await actRes.json();
        }
      } catch {
        setChatClasses([]);
        setChatClasseId("");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const handleMediaBroadcast = (event: Event) => {
      const customEvent = event as CustomEvent<{
        mediaId: string;
        classeId: string;
        title: string;
        url: string;
        type: string;
        thumbnailUrl?: string;
      }>;
      setMediaNotifications((prev) => {
        const exists = prev.some(
          (n) => n.mediaId === customEvent.detail.mediaId,
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            mediaId: customEvent.detail.mediaId,
            title: customEvent.detail.title,
            classeId: customEvent.detail.classeId,
          },
        ];
      });
    };

    window.addEventListener("media-broadcast", handleMediaBroadcast);
    return () =>
      window.removeEventListener("media-broadcast", handleMediaBroadcast);
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== "eleve")) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

  if (!user || user.role !== "eleve") {
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
            <span className="font-bold text-[#f9f6f9]">HMS-GS Élève</span>
            {sessionLabel && (
              <span className="text-[10px] text-[#a4a3ac]">
                Session : {sessionLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/eleve/medias"
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
          <div className="flex items-center gap-1 text-sm text-[#a4a3ac]">
            Bienvenue, <span className="text-[#83a509]">{user.username}</span>
            {classeLabel ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-[#1b2234] px-2 py-0.5 text-[10px] font-medium text-[rgb(156_163_175)]">
                {classeLabel}
              </span>
            ) : null}
            <span className="ml-2 text-[10px]">
              Quiz:{quizEnabled ? "ON 🟢" : "OFF 🔴"}
            </span>
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
              const isQuizDisabled =
                item.href === "/eleve/quiz" && !quizEnabled;
              return (
                <Link key={item.href} href={isQuizDisabled ? "#" : item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] transition-all ${
                      isActive
                        ? "bg-[#1488fc]/10 text-[#1488fc] border border-[#1488fc]"
                        : isQuizDisabled
                          ? "text-[#a4a3ac]/50 cursor-not-allowed"
                          : "text-[#a4a3ac] hover:bg-[#171719/0.6] hover:text-[#f9f6f9]"
                    }`}
                  >
                    <div className="text-lg w-6 text-center">{item.icon}</div>
                    {item.label}
                    {isQuizDisabled && (
                      <span className="text-[10px] ml-auto">(bientôt)</span>
                    )}
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
        userRole="eleve"
        classes={chatClasses}
        defaultClasseId={chatClasseId}
        userImage={user.image || null}
      />
    </div>
  );
}
