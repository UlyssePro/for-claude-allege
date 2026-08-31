"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEleves() {
  return await prisma.eleve.findMany({
    orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
    include: {
      classe: { select: { label: true } },
      genre: { select: { label: true } },
    },
  });
}

export async function getEleve(id: string) {
  return await prisma.eleve.findUnique({
    where: { id },
    include: { classe: true, genre: true },
  });
}

export async function createEleve(data: {
  firstname: string;
  lastname: string;
  dob?: string | null;
  contact?: string | null;
  numero?: string | null;
  classeId?: string | null;
  genreId?: string | null;
  obs?: string | null;
}) {
  await prisma.eleve.create({
    data: {
      firstname: data.firstname,
      lastname: data.lastname,
      dob: data.dob || null,
      sob: null,
      age: null,
      domic: null,
      contact: data.contact || null,
      numero: data.numero || null,
      obs: data.obs || null,
      cas: false,
      photo: null,
      anscol: null,
      classeId: data.classeId || null,
      genreId: data.genreId || null,
    },
  });
  revalidatePath("/admin/eleves");
}

export async function updateEleve(
  id: string,
  data: {
    firstname?: string;
    lastname?: string;
    dob?: string | null;
    contact?: string | null;
    numero?: string | null;
    classeId?: string | null;
    genreId?: string | null;
    obs?: string | null;
  },
) {
  const updateData: Record<string, unknown> = {};
  if (data.firstname) updateData.firstname = data.firstname;
  if (data.lastname) updateData.lastname = data.lastname;
  if (data.dob !== undefined) updateData.dob = data.dob;
  if (data.contact !== undefined) updateData.contact = data.contact;
  if (data.numero !== undefined) updateData.numero = data.numero;
  if (data.classeId !== undefined) updateData.classeId = data.classeId;
  if (data.genreId !== undefined) updateData.genreId = data.genreId;
  if (data.obs !== undefined) updateData.obs = data.obs;

  await prisma.eleve.update({
    where: { id },
    data: updateData,
  });
  revalidatePath("/admin/eleves");
}

export async function deleteEleve(id: string) {
  await prisma.eleve.delete({
    where: { id },
  });
  revalidatePath("/admin/eleves");
}

export async function getClassesList() {
  return await prisma.classe.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true },
  });
}

export async function getGenresList() {
  return await prisma.genreEleve.findMany({
    select: { id: true, label: true, gen: true },
  });
}
