"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CardProfil } from "@/components/for-dash/enseignant/CardProfil";
import { CardClasse } from "@/components/for-dash/enseignant/CardClasse";
import { CardBilan } from "@/components/for-dash/enseignant/CardBilan";
import { toast } from "sonner";

interface EnseignantData {
  id: string;
  nom: string;
  prenom: string;
  contact: string | null;
  adresse: string | null;
  dpservice: string | null;
  profSess: string | null;
  photo: string | null;
  matiere: { id: string; label: string } | null;
  categorie: { id: string; label: string } | null;
}

interface ClasseItem {
  id: string;
  label: string;
  elevesCount: number;
}

export default function EnseignantPage() {
  const [enseignant, setEnseignant] = useState<EnseignantData | null>(null);
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/enseignant/me").then((r) => {
        if (!r.ok) throw new Error("Non autorisé");
        return r.json();
      }),
      fetch("/api/enseignant/dashboard/classe-stats").then((r) => {
        if (!r.ok) throw new Error("Non autorisé");
        return r.json();
      }),
    ])
      .then(([meData, statsData]) => {
        setEnseignant(meData.enseignant);
        setClasses(statsData.classes || []);
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

  if (!enseignant) {
    return (
      <div className="text-center py-12 text-[rgb(156_163_175)]">
        Aucun profil enseignant lié à votre compte.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <CardProfil
        nom={enseignant.nom}
        prenom={enseignant.prenom}
        photo={enseignant.photo}
        contact={enseignant.contact}
        adresse={enseignant.adresse}
        dpservice={enseignant.dpservice}
        profSess={enseignant.profSess}
        matiere={enseignant.matiere?.label}
        id={enseignant.id}
      />
      <CardClasse classes={classes} />
      <CardBilan />
    </div>
  );
}
