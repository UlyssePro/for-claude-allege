"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CardProfil } from "@/components/for-dash/eleve/CardProfil";
import { CardClasseEleve } from "@/components/for-dash/eleve/CardClasse";
import { CardBilanEleve } from "@/components/for-dash/eleve/CardBilan";

interface EleveData {
  id: string;
  firstname: string;
  lastname: string;
  photo: string | null;
  contact: string | null;
  numero: string | null;
  classe?: { id: string; label?: string } | null;
  genre?: { label?: string } | null;
}

interface ClasseItem {
  id: string;
  label: string;
}

export default function ElevePage() {
  const [eleve, setEleve] = useState<EleveData | null>(null);
  const [classe, setClasse] = useState<ClasseItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/eleve/me").then((r) => {
        if (!r.ok) throw new Error("Non autorisé");
        return r.json();
      }),
      fetch("/api/eleve/dashboard/classe-stats").then((r) => {
        if (!r.ok) throw new Error("Non autorisé");
        return r.json();
      }),
    ])
      .then(([meData, statsData]) => {
        setEleve(meData);
        setClasse(statsData.classe);
      })
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-[rgb(156_163_175)]">
        Chargement...
      </div>
    );
  }

  if (!eleve) {
    return (
      <div className="text-center py-12 text-[rgb(156_163_175)]">
        Aucune information élève trouvée
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <CardProfil
        firstname={eleve.firstname}
        lastname={eleve.lastname}
        photo={eleve.photo}
        classe={eleve.classe}
        contact={eleve.contact}
        numero={eleve.numero}
        genre={eleve.genre}
      />
      <CardBilanEleve />
    </div>
  );
}
