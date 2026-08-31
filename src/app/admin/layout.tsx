"use client";

import "@/styles/glass-dark-theme.css";
import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/use-auth";
import { SessionPinger } from "@/components/session-pinger";
import { sidebarMenuItems } from "@/lib/sidebar-menu-items";
import { SessionProvider, useAdminSession } from "@/contexts/session-context";

function AdminContent({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { adminSessionId, setAdminSessionId } = useAdminSession();
  const [sessions, setSessions] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/public/sessions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSessions(list);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0072CE] mx-auto mb-4"></div>
          <p className="text-[#94a3b8]">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0072CE] mx-auto mb-4"></div>
          <p className="text-[#94a3b8]">Redirection...</p>
        </div>
      </div>
    );
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

  const handleSessionChange = (value: string) => {
    setAdminSessionId(value);
    toast.success("Session mise à jour");
  };

  return (
    <div className="theme-bolt h-screen flex overflow-hidden bg-[#0B0F19] text-[#f9f6f9]">
      {/* Header fixe */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#0B0F19]/80 backdrop-blur-md border-b border-[#1e293b] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#0072CE] to-[#00A3E0] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <img src="/uploads/logos/app-logo.png" alt="Logo" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#f9f6f9]">HMS-GS Admin</span>
            <div className="h-6">
              {/* {sessionLabel && (
                <span className="text-[10px] text-[#a4a3ac]">
                  Session : {sessionLabel}
                </span>
              )} */}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select value={adminSessionId} onValueChange={handleSessionChange}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <img
            src={
              user.image
                ? `/uploads/users/${user.image}`
                : "/uploads/users/default.png"
            }
            alt="Photo"
            className="h-8 w-8 rounded-full object-cover border border-[#1e293b]"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/uploads/users/default.png";
            }}
          />
          <div className="flex items-center gap-1 text-sm text-[#a4a3ac]">
            <span>Bienvenue,</span>
            <span className="text-[#83a509]">{user.username}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#00A3E0] text-[#00A3E0] hover:bg-[#00A3E0]/10"
            onClick={handleLogout}
          >
            🚪 Déconnexion
          </Button>
        </div>
      </header>

      {/* Sidebar persistante (en dessous du header fixe) */}
      <aside className="w-64 fixed top-14 bottom-0 overflow-y-auto p-4 space-y-2 border-r border-[#1e293b] scrollbar-thin scrollbar-thumb-[#00A3E0]/40 scrollbar-track-transparent scrollbar-thumb-rounded-full">
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
                        ? "bg-[rgba(0,114,206,0.1)] text-[#00A3E0] border border-[#00A3E0]"
                        : "text-[#94a3b8] hover:bg-[#111827]/60 hover:text-[#f9f6f9]"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </div>
                </Link>
              );
            })}
        </nav>
      </aside>

      {/* Content principal (aligné après header + sidebar) */}
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
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AdminContent>{children}</AdminContent>
    </SessionProvider>
  );
}
