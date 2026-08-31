"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Users,
  BookOpen,
  GraduationCap,
  ClipboardList,
  FileText,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useAdminSession } from "@/contexts/session-context";

interface Stats {
  eleves: number;
  enseignants: number;
  classes: number;
  matieres: number;
  repartitions: number;
  quizs: number;
  notes: number;
  loggedUsers: number;
}

interface RepartitionData {
  id: string;
  classe: { label: string } | null;
  enseignant: { nom: string; prenom: string } | null;
  matiere: { label: string } | null;
  lieuEcole: { label: string } | null;
  statut: string;
  createdAt: string;
}

interface EleveData {
  id: string;
  firstname: string;
  lastname: string;
  classe: { label: string } | null;
  createdAt: string;
}

interface EnseignantData {
  id: string;
  nom: string;
  prenom: string;
  matiere: { label: string } | null;
  createdAt: string;
}

interface DashboardData {
  stats: Stats;
  latestRepartitions: RepartitionData[];
  repartitionsByStatut: { statut: string; _count: { statut: number } }[];
  latestEleves: EleveData[];
  latestEnseignants: EnseignantData[];
}

const STAT_CARDS = [
  {
    path: "/admin/classes",
    label: "Classes",
    key: "classes",
    icon: BookOpen,
    color: "rgb(255_191_0)",
  },
  {
    path: "/admin/matieres",
    label: "Matières",
    key: "matieres",
    icon: ClipboardList,
    color: "rgb(102_235_102)",
  },
  {
    path: "/admin/enseignants",
    label: "Enseignants",
    key: "enseignants",
    icon: GraduationCap,
    color: "rgb(168_85_247)",
  },
  {
    path: "/admin/repartitions",
    label: "Répartitions",
    key: "repartitions",
    icon: FileText,
    color: "rgb(96_165_250)",
  },
  {
    path: "/admin/eleves",
    label: "Élèves",
    key: "eleves",
    icon: Users,
    color: "rgb(108_230_241)",
  },
  {
    path: "/admin/users",
    label: "Connectés",
    key: "loggedUsers",
    icon: UserCheck,
    color: "rgb(74_222_124)",
  },
] as const;

const formatDate = (d: string | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR");
};

export default function AdminDashboardPage() {
  const { adminSessionId } = useAdminSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Erreur de chargement du dashboard"))
      .finally(() => setLoading(false));
  }, [adminSessionId]);

  useEffect(() => {
    const runCleanup = async () => {
      try {
        await fetch("/api/auth/cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes: 30 }),
        });
      } catch {
        // ignore
      }
    };

    runCleanup();
    const interval = window.setInterval(runCleanup, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-[#94a3b8]">Chargement...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-[#94a3b8]">
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="p-3 relative rounded-[var(--radius-lg)] bg-[var(--surface)] backdrop-blur-xl transition-all duration-200 ease-in-out hover:border-[var(--accent)] shadow-lg hover:shadow-xl"
            >
              <div className="flex justify-between items-center font-bold">
                <Link href={card.path}>{card.label}</Link>
                <Icon
                  className={`h-3.5 w-3.5 text-[${card.color}]`}
                  style={{ color: card.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-cols-1 lg:flex-cols-2 gap-2">
        <div className="w-full">
          <Card>
            <CardHeader>
              <CardTitle>Derniers élèves inscrits</CardTitle>
            </CardHeader>
            <CardContent>
              {data.latestEleves.length === 0 ? (
                <p className="text-center text-[#94a3b8] py-2 text-xs">
                  Aucun élève
                </p>
              ) : (
                <div className="space-y-1.5">
                  {data.latestEleves.map((eleve) => (
                    <div
                      key={eleve.id}
                      className="flex items-center justify-between p-1 rounded bg-[rgb(31_41_55)]/50"
                    >
                      <div>
                        <p className="text-[11px] text-[rgb(243_244_246)]">
                          {eleve.firstname} {eleve.lastname}
                        </p>
                        <p className="text-[10px] text-[#94a3b8]">
                          {eleve.classe?.label || "Aucune classe"}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#94a3b8]">
                        {formatDate(eleve.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="w-full">
          <Card>
            <CardHeader>
              <CardTitle>Derniers enseignants ajoutés</CardTitle>
            </CardHeader>
            <CardContent>
              {data.latestEnseignants.length === 0 ? (
                <p className="text-center text-[#94a3b8] py-2 text-xs">
                  Aucun enseignant
                </p>
              ) : (
                <div className="space-y-1.5">
                  {data.latestEnseignants.map((ens) => (
                    <div
                      key={ens.id}
                      className="flex items-center justify-between p-1 rounded bg-[rgb(31_41_55)]/50"
                    >
                      <div>
                        <p className="text-[11px] text-[rgb(243_244_246)]">
                          {ens.nom} {ens.prenom}
                        </p>
                        <p className="text-[10px] text-[#94a3b8]">
                          {ens.matiere?.label || "Aucune matière"}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#94a3b8]">
                        {formatDate(ens.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
