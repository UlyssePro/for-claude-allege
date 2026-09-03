import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const periods = [
  { code: "P1", name: "Période 1", startDate: "2026-09-07", endDate: "2026-10-30", order: 1, description: "Culture informatique et environnement de travail" },
  { code: "P2", name: "Période 2", startDate: "2026-11-09", endDate: "2026-12-19", order: 2, description: "Bureautique et production numérique" },
  { code: "P3", name: "Période 3", startDate: "2027-01-04", endDate: "2027-02-26", order: 3, description: "Tableur, données, Internet et réseaux selon le niveau" },
  { code: "P4", name: "Période 4", startDate: "2027-03-01", endDate: "2027-04-30", order: 4, description: "Réseaux/cybersécurité en 4ème ; algorithmique en 2nde" },
  { code: "P5", name: "Période 5", startDate: "2027-05-10", endDate: "2027-07-03", order: 5, description: "Algorithmique/projet en 4ème ; programmation/projet en 2nde" },
];

const curriculaData: Record<string, Array<{
  period: string;
  title: string;
  objective: string;
  modules: Array<[string, string, string[]]>;
}>> = {
  "4EME": [
    {
      period: "P1",
      title: "Culture informatique et environnement de travail",
      objective: "Comprendre le fonctionnement général d'un ordinateur, identifier ses composants, utiliser un système d'exploitation et organiser les fichiers.",
      modules: [
        ["M01", "Introduction à l'informatique", ["Définition de l'informatique", "Information et donnée", "Traitement de l'information", "Ordinateur et système informatique", "TIC et numérique", "Domaines d'utilisation", "Évolution de l'informatique"]],
        ["M02", "Architecture d'un ordinateur", ["Unité centrale", "Processeur", "Mémoire RAM", "Disque dur / SSD", "Carte mère", "Alimentation", "Ports et connecteurs", "Périphériques"]],
        ["M03", "Système d'exploitation", ["Rôle d'un système d'exploitation", "Windows", "Linux", "Bureau et fenêtres", "Applications", "Paramètres"]],
        ["M04", "Gestion des fichiers", ["Fichier", "Dossier", "Extension", "Chemin d'accès", "Copier", "Déplacer", "Supprimer", "Renommer", "Rechercher", "Sauvegarder"]],
      ],
    },
    {
      period: "P2",
      title: "Traitement de texte et production numérique",
      objective: "Produire des documents scolaires correctement structurés, mis en forme et exportés.",
      modules: [
        ["M05", "Traitement de texte", ["Saisie", "Sélection", "Copier/coller", "Mise en forme", "Paragraphes", "Listes"]],
        ["M06", "Mise en page", ["Marges", "Orientation", "Format papier", "En-tête", "Pied de page", "Numérotation", "Tableaux", "Images"]],
        ["M07", "Document structuré", ["Lettre", "Compte rendu", "Fiche", "Rapport", "Tableau"]],
        ["M08", "Gestion et impression", ["DOCX", "ODT", "PDF", "Sauvegarde", "Export PDF", "Impression"]],
      ],
    },
    {
      period: "P3",
      title: "Tableur et données",
      objective: "Saisir, calculer, mettre en forme et représenter des données scolaires.",
      modules: [
        ["M09", "Découverte du tableur", ["Classeur", "Feuille", "Ligne", "Colonne", "Cellule", "Adresse", "Plage", "Données"]],
        ["M10", "Saisie et mise en forme", ["Texte", "Nombre", "Date", "Pourcentage", "Décimale", "Largeur", "Hauteur", "Bordures", "Alignement"]],
        ["M11", "Formules et fonctions", ["Opérations", "SOMME", "MOYENNE", "MAX", "MIN", "Pourcentage", "Classement"]],
        ["M12", "Graphiques", ["Colonnes", "Circulaire", "Courbes", "Titre", "Légende"]],
      ],
    },
    {
      period: "P4",
      title: "Internet, réseaux et sécurité numérique",
      objective: "Comprendre Internet, rechercher de l'information, communiquer et adopter des comportements sûrs.",
      modules: [
        ["M13", "Comprendre Internet", ["Internet", "Web", "Navigateur", "Site web", "Page web", "URL", "Moteur de recherche", "Serveur", "Client"]],
        ["M14", "Recherche d'information", ["Mots-clés", "Recherche efficace", "Comparaison des sources", "Vérification", "Téléchargement"]],
        ["M15", "Communication numérique", ["E-mail", "Pièce jointe", "Messagerie", "Visioconférence", "Stockage en ligne", "Comportement numérique"]],
        ["M16", "Sécurité informatique", ["Mot de passe", "Phishing", "Virus", "Malware", "Arnaques", "Données personnelles", "Confidentialité", "Sauvegarde", "Mises à jour"]],
        ["M17", "Réseaux informatiques", ["Réseau", "LAN", "Wi-Fi", "Routeur", "Switch", "Adresse IP", "Partage de ressources"]],
      ],
    },
    {
      period: "P5",
      title: "Algorithmique et initiation à la programmation",
      objective: "Développer la logique algorithmique et réaliser un premier programme interactif avec Scratch.",
      modules: [
        ["M18", "Algorithme", ["Problème", "Solution", "Algorithme", "Instruction", "Séquence", "Condition", "Répétition"]],
        ["M19", "Variables", ["Donnée", "Variable", "Valeur", "Entrée", "Sortie"]],
        ["M20", "Conditions", ["SI", "SINON", "Comparaisons"]],
        ["M21", "Boucles", ["Répéter", "Répéter jusqu'à", "Compteur"]],
        ["M22", "Programmation visuelle", ["Scratch", "Sprites", "Blocs", "Événements", "Variables", "Conditions", "Boucles"]],
      ],
    },
  ],
  "2NDE": [
    {
      period: "P1",
      title: "Culture informatique, matériel et systèmes",
      objective: "Approfondir la culture informatique, l'architecture des systèmes, les unités de données et les systèmes d'exploitation.",
      modules: [
        ["M01", "Informatique et société", ["Histoire", "Évolution des ordinateurs", "Numérique", "TIC", "Domaines professionnels", "Avantages et limites"]],
        ["M02", "Architecture informatique", ["CPU", "RAM", "ROM", "Stockage", "Carte mère", "GPU", "Alimentation", "Périphériques", "Ports"]],
        ["M03", "Représentation de l'information", ["Binaire", "Décimal", "Bit", "Octet", "Ko", "Mo", "Go", "To", "Codage"]],
        ["M04", "Systèmes d'exploitation", ["Windows", "Linux", "Fichiers", "Processus", "Utilisateurs", "Permissions", "Logiciels"]],
      ],
    },
    {
      period: "P2",
      title: "Bureautique avancée et traitement des données",
      objective: "Produire des rapports structurés et analyser des données avec les outils bureautiques.",
      modules: [
        ["M05", "Traitement de texte avancé", ["Styles", "Titres", "Table des matières", "Tableaux", "Images", "Sections", "En-têtes", "Numérotation", "Export PDF"]],
        ["M06", "Tableur avancé", ["SOMME", "MOYENNE", "MIN", "MAX", "SI", "NB", "NB.SI", "Références", "Filtres", "Tri", "Graphiques"]],
        ["M07", "Analyse de données", ["Moyenne générale", "Meilleur résultat", "Résultat le plus faible", "Nombre d'admis", "Pourcentage de réussite"]],
      ],
    },
    {
      period: "P3",
      title: "Internet, réseaux et cybersécurité",
      objective: "Comprendre le fonctionnement d'Internet, les réseaux et les principaux risques de cybersécurité.",
      modules: [
        ["M08", "Fonctionnement d'Internet", ["Internet", "Web", "Serveur", "Client", "DNS", "Adresse IP", "URL", "HTTP", "HTTPS"]],
        ["M09", "Réseaux informatiques", ["PAN", "LAN", "MAN", "WAN", "Switch", "Routeur", "Point d'accès", "Modem", "Topologies"]],
        ["M10", "Adressage réseau", ["IPv4", "Adresse réseau", "Adresse hôte", "Masque", "Passerelle", "DNS"]],
        ["M11", "Cybersécurité", ["Malware", "Virus", "Ransomware", "Phishing", "Ingénierie sociale", "Mots de passe", "Authentification", "Sauvegarde", "Chiffrement", "Confidentialité"]],
      ],
    },
    {
      period: "P4",
      title: "Algorithmique et programmation",
      objective: "Analyser des problèmes, écrire des algorithmes et programmer des solutions structurées en Python.",
      modules: [
        ["M12", "Algorithmique", ["Problème", "Analyse", "Algorithme", "Pseudo-code", "Organigramme", "Séquence", "Condition", "Boucle"]],
        ["M13", "Variables et types", ["Entier", "Réel", "Chaîne", "Booléen", "Variable", "Constante", "Entrée", "Sortie"]],
        ["M14", "Conditions", ["SI", "SINON", "SINON SI", "Comparaisons", "Opérateurs logiques"]],
        ["M15", "Boucles", ["POUR", "TANT QUE", "Compteur", "Répétition conditionnelle"]],
        ["M16", "Fonctions", ["Fonction", "Paramètre", "Valeur de retour", "Réutilisation", "Modularité"]],
      ],
    },
    {
      period: "P5",
      title: "Programmation et projet informatique",
      objective: "Développer une petite application Python utilisant des structures de données, des fonctions et des fichiers.",
      modules: [
        ["M17", "Structures de données simples", ["Listes", "Chaînes", "Dictionnaires simples", "Parcours de données"]],
        ["M18", "Fonctions et modularité", ["Organisation", "Fonctions réutilisables", "Paramètres", "Valeurs de retour"]],
        ["M19", "Fichiers", ["Création", "Lecture", "Écriture", "Sauvegarde", "Fichiers texte"]],
        ["M20", "Introduction aux bases de données", ["Donnée", "Table", "Champ", "Enregistrement", "Identifiant", "Base de données"]],
      ],
    },
  ],
};

async function main() {
  console.log("Seeding curriculum data...");

  const year = await prisma.schoolYear.upsert({
    where: { label: "2026-2027" },
    update: {},
    create: {
      label: "2026-2027",
      startDate: new Date("2026-09-07"),
      endDate: new Date("2027-07-03"),
      description: "Programme annuel d'informatique 2026-2027 — adaptation pédagogique pour Madagascar.",
    },
  });
  console.log("  school_year: 2026-2027");

  for (const p of periods) {
    await prisma.period.upsert({
      where: { schoolYearId_code: { schoolYearId: year.id, code: p.code } },
      update: {
        name: p.name,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        order: p.order,
        description: p.description,
      },
      create: {
        schoolYearId: year.id,
        code: p.code,
        name: p.name,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        order: p.order,
        description: p.description,
      },
    });
  }
  console.log("  periods: " + periods.length);

  for (const [levelCode, periodsData] of Object.entries(curriculaData)) {
    const level = await prisma.classLevel.upsert({
      where: { code: levelCode },
      update: {},
      create: {
        code: levelCode,
        name: levelCode === "4EME" ? "4ème" : "2nde",
        cycle: levelCode === "4EME" ? "Collège" : "Lycée",
      },
    });

    for (const periodData of periodsData) {
      const period = await prisma.period.findUniqueOrThrow({
        where: { schoolYearId_code: { schoolYearId: year.id, code: periodData.period } },
      });

      const curriculum = await prisma.curriculum.upsert({
        where: {
          schoolYearId_classLevelId_periodId: {
            schoolYearId: year.id,
            classLevelId: level.id,
            periodId: period.id,
          },
        },
        update: {
          title: periodData.title,
          objective: periodData.objective,
          status: "PUBLISHED",
        },
        create: {
          title: periodData.title,
          objective: periodData.objective,
          status: "PUBLISHED",
          schoolYearId: year.id,
          classLevelId: level.id,
          periodId: period.id,
        },
      });

      for (let i = 0; i < periodData.modules.length; i++) {
        const [code, title, notions] = periodData.modules[i];

        const module = await prisma.module.upsert({
          where: { curriculumId_order: { curriculumId: curriculum.id, order: i + 1 } },
          update: { code, title },
          create: { curriculumId: curriculum.id, code, title, order: i + 1 },
        });

        for (let j = 0; j < notions.length; j++) {
          const chapter = await prisma.chapter.upsert({
            where: { moduleId_order: { moduleId: module.id, order: j + 1 } },
            update: { title: notions[j] },
            create: { moduleId: module.id, title: notions[j], order: j + 1 },
          });

          await prisma.lesson.upsert({
            where: { chapterId_order: { chapterId: chapter.id, order: 1 } },
            update: {},
            create: {
              chapterId: chapter.id,
              title: `Leçon — ${notions[j]}`,
              order: 1,
              type: "COURSE",
            },
          });
        }
      }
    }
  }

  console.log("  class_levels: 2 (4EME, 2NDE)");
  console.log("  curricula: 10 (2 levels x 5 periods)");
  console.log("\nCurriculum seeding complete!");
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
