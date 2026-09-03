"use client";

import "@/styles/glass-dark-theme.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Role = "admin" | "prof" | "eleve";

interface Eleve {
  id: string;
  firstname: string;
  lastname: string;
  numero: string | null;
}

interface UserRef {
  id: string;
  username: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("admin");
  const [nom, setNom] = useState("");
  const [password, setPassword] = useState("");
  const [classe, setClasse] = useState("");
  const [eleveId, setEleveId] = useState("");
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<{ id: string; label: string }[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [sessions, setSessions] = useState<{ id: string; label: string }[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  const getCurrentSessionLabel = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0 = january
    const startYear = month >= 8 ? year : year - 1;
    const endYear = startYear + 1;
    return {
      full: `${startYear}-${endYear}`,
      short: `${String(startYear).slice(2)}-${String(endYear).slice(2)}`,
    };
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setNom("");
    setPassword("");
    setClasse("");
    setEleveId("");
    setEleves([]);
    setClasses([]);
    setSelectedUserId("");
  };

  useEffect(() => {
    fetch("/api/public/sessions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSessions(list);
        if (list.length > 0 && !sessionId) {
          const { full, short } = getCurrentSessionLabel();
          const matched = list.find(
            (s: { id: string; label: string }) =>
              s.label === full || s.label === short,
          );
          setSessionId(matched ? matched.id : list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadEleves = async () => {
    if (!classe) {
      setEleves([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set("classeId", classe);
      if (sessionId) {
        params.set("sessionId", sessionId);
      }
      const res = await fetch(`/api/eleves?${params.toString()}`);
      const data = await res.json();
      const formatted = (data || []).map((e: any) => ({
        id: e.id,
        firstname: e.firstname,
        lastname: e.lastname,
        numero: e.numero,
      }));
      setEleves(formatted);
      setEleveId("");
    } catch (e) {
      toast.error("Erreur lors du chargement des élèves");
    }
  };

  const loadUsers = async () => {
    if (role === "eleve" || role === "admin") {
      setUsers([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set("role", "Enseignant");
      if (sessionId) {
        params.set("sessionId", sessionId);
      }
      const res = await fetch(`/api/auth/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data || []);
      setNom("");
    } catch {
      toast.error("Erreur lors du chargement des utilisateurs");
    }
  };

  useEffect(() => {
    if (role === "eleve") {
      fetch("/api/classes")
        .then((res) => res.json())
        .then((data) => setClasses(data || []))
        .catch(() => toast.error("Erreur lors du chargement des classes"));
    } else {
      setClasses([]);
    }
  }, [role]);

  useEffect(() => {
    if (role === "prof" && sessionId) {
      loadUsers();
    }
  }, [role, sessionId]);

  useEffect(() => {
    loadEleves();
  }, [classe, sessionId]);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (role !== "admin" && !sessionId) {
      toast.error("Veuillez sélectionner une session");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          role === "eleve" ? { role, eleveId, sessionId } : role === "admin" ? { role, nom, password } : { role, nom, password, sessionId },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erreur de connexion");
        return;
      }

      toast.success("Connexion réussie");

      if (data.user.role === "eleve") {
        router.push("/eleve");
      } else if (data.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/enseignant");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[rgb(27_34_52)] via-[rgb(17_24_40)] to-[rgb(17_24_40)] -z-10" />

      <Card className="w-full max-w-md bg-[var(--surface-alt)] border-[var(--border-light)]" hover>
        <CardHeader>
          <CardTitle className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden">
                <Image src="/uploads/logos/app-logo.png" alt="Logo HMS" width={36} height={36} className="h-full w-full object-cover" priority />
              </div>
              <span className="text-xl">HMS-GS</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {role !== "admin" && (
            <div className="space-y-2 mb-6">
              <Label htmlFor="session">Session</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger id="session">
                  <SelectValue placeholder="-- Choisir la session --" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <Button
              variant={role === "admin" ? "default" : "secondary"}
              size="sm"
              onClick={() => handleRoleChange("admin")}
              className="flex-1"
            >
              👑 Admin
            </Button>
            <Button
              variant={role === "prof" ? "default" : "secondary"}
              size="sm"
              onClick={() => handleRoleChange("prof")}
              className="flex-1"
            >
              👨‍🏫 Prof
            </Button>
            <Button
              variant={role === "eleve" ? "default" : "secondary"}
              size="sm"
              onClick={() => handleRoleChange("eleve")}
              className="flex-1"
            >
              🎒 Élève
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {role !== "eleve" && (
              <>
                {role === "prof" ? (
                  <div className="space-y-2">
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Select value={nom} onValueChange={setNom}>
                      <SelectTrigger id="username">
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.username} value={u.username}>
                            {u.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Votre nom..."
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Votre mot de passe..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {role === "eleve" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="eleve-classe">Classe</Label>
                  <Select value={classe} onValueChange={setClasse}>
                    <SelectTrigger id="eleve-classe">
                      <SelectValue placeholder="-- Choisir la classe --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Choisir la classe --</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {classe && (
                  <div className="space-y-2">
                    <Label htmlFor="eleve-nom">Nom</Label>
                    <Select value={eleveId} onValueChange={setEleveId}>
                      <SelectTrigger id="eleve-nom">
                        <SelectValue placeholder="-- Choisir un élève --" />
                      </SelectTrigger>
                      <SelectContent>
                        {eleves.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.firstname} {e.lastname}{" "}
                            <span className="text-[rgb(156_163_175)]">
                              (N° {e.numero || "?"})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[rgb(156_163_175)]">
                      Pas de mot de passe — sélectionnez simplement votre nom
                    </p>
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              className={`w-full ${role === "admin"
                ? "bg-[rgb(255_77_77)] text-white hover:bg-[rgb(240_70_70)]"
                : role === "prof"
                  ? "bg-[rgb(108_230_241)] text-[rgb(17_24_40)] hover:bg-[rgb(94_217_229)]"
                  : "bg-[rgb(168_85_247)] text-white hover:bg-[rgb(150_75_230)]"
                }`}
              disabled={role !== "admin" && !sessionId || (role === "eleve" && (!classe || !eleveId))}
            >
              Se connecter (
              {role === "admin" ? "Admin" : role === "prof" ? "Prof" : "Élève"})
            </Button>
          </form>

          {role !== "eleve" && (
            <p className="text-center text-xs text-[rgb(156_163_175)] mt-4">
              Admin par défaut : admin / admin123
            </p>
          )}

          {role !== "eleve" && (
            <p className="text-center text-xs mt-2">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-[rgb(108_230_241)] hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
