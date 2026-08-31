"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEnseignants() {
  return await prisma.enseignant.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: {
      matiere: { select: { id: true, label: true } },
      categorie: { select: { id: true, label: true } },
    },
  });
}

export async function getEnseignant(id: string) {
  return await prisma.enseignant.findUnique({
    where: { id },
    include: { matiere: true, categorie: true },
  });
}

export async function createEnseignant(data: {
  nom: string;
  prenom: string;
  contact?: string | null;
  adresse?: string | null;
  dpservice?: string | null;
  profSess?: string | null;
  matiereId?: string | null;
  categorieId?: string | null;
}) {
  await prisma.enseignant.create({
    data: {
      nom: data.nom,
      prenom: data.prenom,
      contact: data.contact || null,
      adresse: data.adresse || null,
      dpservice: data.dpservice || null,
      profSess: data.profSess || null,
      matiereId: data.matiereId || null,
      categorieId: data.categorieId || null,
      photo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  revalidatePath("/admin/enseignants");
}

export async function updateEnseignant(
  id: string,
  data: {
    nom?: string;
    prenom?: string;
    contact?: string | null;
    adresse?: string | null;
    dpservice?: string | null;
    profSess?: string | null;
    matiereId?: string | null;
    categorieId?: string | null;
  },
) {
  await prisma.enseignant.update({
    where: { id },
    data: {
      ...(data.nom && { nom: data.nom }),
      ...(data.prenom && { prenom: data.prenom }),
      ...(data.contact !== undefined && { contact: data.contact }),
      ...(data.adresse !== undefined && { adresse: data.adresse }),
      ...(data.dpservice !== undefined && { dpservice: data.dpservice }),
      ...(data.profSess !== undefined && { profSess: data.profSess }),
      ...(data.matiereId !== undefined && { matiereId: data.matiereId }),
      ...(data.categorieId !== undefined && { categorieId: data.categorieId }),
      updatedAt: new Date(),
    },
  });
  revalidatePath("/admin/enseignants");
}

export async function deleteEnseignant(id: string) {
  await prisma.enseignant.delete({
    where: { id },
  });
  revalidatePath("/admin/enseignants");
}

export async function getMatieresList() {
  return await prisma.matiere.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true },
  });
}

export async function getCategoriesList() {
  return await prisma.classeCategorie.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true },
  });
}
