import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "fs";

const adapter = new PrismaLibSql({
  url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

interface DbJson {
  roles: Array<{ id: string; label: string }>;
  users: Array<{
    id: string;
    username: string;
    email: string;
    password: string;
    image?: string;
    logged?: boolean;
    roleId?: string;
    resetToken?: string | null;
    resetTokenExpires?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
  classes_categories: Array<{ id: string; label: string }>;
  lieux_ecoles: Array<{ id: string; label: string; taux?: number }>;
  usualClasses: Array<{ id: string; libelle: string }>;
  genres_eleve: Array<{ id: string; label: string; gen: string }>;
  matieres: Array<{
    id: string;
    label: string;
    abrev?: string;
    coeff?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  classes: Array<{
    id: string;
    label: string;
    usualClasseId?: string;
    categorieId?: string;
  }>;
  enseignants: Array<{
    id: string;
    nom: string;
    prenom: string;
    contact?: string;
    adresse?: string;
    dpservice?: string;
    profSess?: string;
    matiereId?: string;
    photo?: string;
  }>;
  eleves: Array<{
    id: string;
    firstname: string;
    lastname: string;
    dob?: string;
    sob?: string;
    age?: string;
    domic?: string;
    contact?: string;
    numero?: string;
    obs?: string;
    photo?: string;
    anscol?: string;
    classeId?: string;
    genreId?: string;
  }>;
  notes: Array<{
    id: string;
    eleveId: string;
    profId: string;
    matiereId: string;
    note1?: string;
    note2?: string;
    note3?: string;
    note4?: string;
    note5?: string;
  }>;
  trimestres: Array<{
    id: string;
    matiereId: string;
    enseignantId: string;
    classeId: number;
    numero: number;
    lecon: string;
    examen1?: string;
    examen2?: string;
  }>;
  cahiers: Array<{
    id: string;
    trimestreId: string;
    titre: any;
    objectif: any;
    notion: any;
    exercice: any;
    pratique: any;
  }>;
  grilles_emploi_temps: Array<{
    id: string;
    position: number;
    annee?: string;
    task?: string;
    enseignantId: string;
    matiereId?: string;
    classeId?: string;
    lieuId?: string;
    horaireId?: string;
    date?: string;
  }>;
  emploi_du_temps_eleves: Array<{
    id: string;
    eleveId: string;
    position: number;
    date?: string;
    annee?: string;
    jour?: number;
    matiereId?: string;
    classeId?: string;
    lieuId?: string;
    horaireId?: string;
    sourceGrilleId?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  repartitions: Array<{
    id: string;
    numItem?: number;
    annee?: string;
    monthId?: number;
    day?: number;
    date?: string;
    position?: number;
    taux?: number;
    statut?: string;
    matiereId?: string;
    enseignantId?: string;
    classeId?: string;
    semaineId?: string;
    hourId?: string;
    lieuId?: string;
  }>;
  auth_sessions: Array<{
    id: string;
    userId: string;
    token: string;
    expires?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

const data = JSON.parse(readFileSync("original-db.json", "utf-8")) as DbJson;

function cleanString(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value === "" ? undefined : value;
}

async function main() {
  console.log("Seeding database from original-db.json...");

  await prisma.role.createMany({ data: data.roles });
  console.log("  roles: " + data.roles.length);

  await prisma.user.createMany({
    data: data.users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      password: u.password,
      image: cleanString(u.image),
      logged: Boolean(u.logged),
      roleId: cleanString(u.roleId),
      resetToken: cleanString(u.resetToken),
      resetTokenExpires: cleanString(u.resetTokenExpires),
      createdAt: cleanString(u.createdAt),
      updatedAt: cleanString(u.updatedAt),
    })),
  });
  console.log("  users: " + data.users.length);

  await prisma.classeCategorie.createMany({ data: data.classes_categories });
  console.log("  classes_categories: " + data.classes_categories.length);

  await prisma.lieuEcole.createMany({
    data: data.lieux_ecoles.map((l) => ({ ...l, taux: l.taux ?? undefined })),
  });
  console.log("  lieux_ecoles: " + data.lieux_ecoles.length);

  await prisma.usualClasse.createMany({ data: data.usualClasses });
  console.log("  usualClasses: " + data.usualClasses.length);

  await prisma.genreEleve.createMany({ data: data.genres_eleve });
  console.log("  genres_eleve: " + data.genres_eleve.length);

  await prisma.matiere.createMany({
    data: data.matieres.map((m) => ({
      id: m.id,
      label: m.label,
      abrev: cleanString(m.abrev),
      coeff: cleanString(m.coeff),
      createdAt: cleanString(m.createdAt),
      updatedAt: cleanString(m.updatedAt),
    })),
  });
  console.log("  matieres: " + data.matieres.length);

  await prisma.classe.createMany({
    data: data.classes.map((c) => ({
      ...c,
      usualClasseId: cleanString(c.usualClasseId),
      categorieId: cleanString(c.categorieId),
    })),
  });
  console.log("  classes: " + data.classes.length);

  await prisma.enseignant.createMany({
    data: data.enseignants.map((e) => ({
      ...e,
      contact: cleanString(e.contact),
      adresse: cleanString(e.adresse),
      dpservice: cleanString(e.dpservice),
      profSess: cleanString(e.profSess),
      matiereId: cleanString(e.matiereId),
      photo: cleanString(e.photo),
    })),
  });
  console.log("  enseignants: " + data.enseignants.length);

  await prisma.eleve.createMany({
    data: data.eleves.map((e) => ({
      ...e,
      dob: cleanString(e.dob),
      sob: cleanString(e.sob),
      age: cleanString(e.age),
      domic: cleanString(e.domic),
      contact: cleanString(e.contact),
      numero: cleanString(e.numero),
      obs: cleanString(e.obs),
      photo: cleanString(e.photo),
      anscol: cleanString(e.anscol),
      classeId: cleanString(e.classeId),
      genreId: cleanString(e.genreId),
    })),
  });
  console.log("  eleves: " + data.eleves.length);

  await prisma.note.createMany({
    data: data.notes.map((n) => ({
      ...n,
      note1: cleanString(n.note1),
      note2: cleanString(n.note2),
      note3: cleanString(n.note3),
      note4: cleanString(n.note4),
      note5: cleanString(n.note5),
    })),
  });
  console.log("  notes: " + data.notes.length);

  await prisma.trimestre.createMany({
    data: data.trimestres.map((t) => ({
      ...t,
      examen1: cleanString(t.examen1),
      examen2: cleanString(t.examen2),
    })),
  });
  console.log("  trimestres: " + data.trimestres.length);

  await prisma.cahier.createMany({
    data: data.cahiers.map((c) => ({
      id: c.id,
      trimestreId: c.trimestreId,
      titre: c.titre ?? undefined,
      objectif: c.objectif ?? undefined,
      notion: c.notion ?? undefined,
      exercice: c.exercice ?? undefined,
      pratique: c.pratique ?? undefined,
    })),
  });
  console.log("  cahiers: " + data.cahiers.length);

  await prisma.grilleEmploiTemps.createMany({
    data: data.grilles_emploi_temps.map((g) => ({
      ...g,
      annee: cleanString(g.annee),
      task: cleanString(g.task),
      matiereId: cleanString(g.matiereId),
      classeId: cleanString(g.classeId),
      lieuId: cleanString(g.lieuId),
      horaireId: cleanString(g.horaireId),
      date: cleanString(g.date),
    })),
  });
  console.log("  grilles_emploi_temps: " + data.grilles_emploi_temps.length);

  await prisma.emploiDuTempsEleve.createMany({
    data: data.emploi_du_temps_eleves.map((e) => ({
      ...e,
      date: cleanString(e.date),
      annee: cleanString(e.annee),
      matiereId: cleanString(e.matiereId),
      classeId: cleanString(e.classeId),
      lieuId: cleanString(e.lieuId),
      horaireId: cleanString(e.horaireId),
      sourceGrilleId: cleanString(e.sourceGrilleId),
      createdAt: cleanString(e.createdAt),
      updatedAt: cleanString(e.updatedAt),
    })),
  });
  console.log("  emploi_du_temps_eleves: " + data.emploi_du_temps_eleves.length);

  await prisma.repartition.createMany({
    data: data.repartitions.map((r) => ({
      ...r,
      numItem: r.numItem ?? undefined,
      annee: cleanString(r.annee),
      monthId: r.monthId ?? undefined,
      day: r.day ?? undefined,
      date: cleanString(r.date),
      position: r.position ?? undefined,
      taux: r.taux ?? undefined,
      statut: cleanString(r.statut),
      matiereId: cleanString(r.matiereId),
      enseignantId: cleanString(r.enseignantId),
      classeId: cleanString(r.classeId),
      semaineId: cleanString(r.semaineId),
      hourId: cleanString(r.hourId),
      lieuId: cleanString(r.lieuId),
    })),
  });
  console.log("  repartitions: " + data.repartitions.length);

  await prisma.authSession.createMany({
    data: data.auth_sessions.map((s) => ({
      ...s,
      expires: cleanString(s.expires),
      createdAt: cleanString(s.createdAt),
      updatedAt: cleanString(s.updatedAt),
    })),
  });
  console.log("  auth_sessions: " + data.auth_sessions.length);

  console.log("\nSeeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
