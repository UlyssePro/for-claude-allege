import Database from "better-sqlite3";
const sqlite = new Database("./dev.db");

const classes = sqlite.prepare('SELECT id, label FROM classes ORDER BY id').all();
const existing = new Set(
  sqlite.prepare('SELECT DISTINCT classeId FROM trimestres').all()
    .map((r) => String(r.classeId))
);

const matiereRow = sqlite.prepare('SELECT id FROM matieres LIMIT 1').get();
const matiereId = matiereRow ? matiereRow.id : "cmsnc0ve3000aiodx0z87tveg";
const enseignantId = "cmsnd3s62000giodxasfemq41";

const now = () => new Date().toISOString().replace("T", " ").replace("Z", "");

const contentByLevel: Record<string, { t1: string; t2: string; t3: string; titre: string; objectif: string; notion: string; exercice: string; pratique: string }> = {
  "5A": { t1: "Geometrie et mesures", t2: "Fractions et decimales", t3: "Projet et evaluations", titre: "Programme 5A", objectif: "Maitriser les concepts du niveau 5A", notion: "Geometrie, fractions, decimales", exercice: "Exercices de revision et approfondissement", pratique: "Travaux pratiques et projets" },
  "5B": { t1: "Algebre et calcul", t2: "Proportionnalite", t3: "Synthese et projets", titre: "Programme 5B", objectif: "Maitriser les concepts du niveau 5B", notion: "Algebre, proportionnalite, statistiques", exercice: "Exercices varies et progresifs", pratique: "Projets collectifs et presentations" },
  "5C": { t1: "Numeration et operations", t2: "Geometrie et espaces", t3: "Evaluation et projets", titre: "Programme 5C", objectif: "Consolider les acquis du niveau 5C", notion: "Numeration, geometrie, grandeurs", exercice: "Exercices de consolidation", pratique: "Activites pratiques et enquetes" },
  "5D": { t1: "Calcul et algebre", t2: "Organisation de donnees", t3: "Projet interdisciplinaire", titre: "Programme 5D", objectif: "Approfondir les mathematiques", notion: "Calcul litteral, statistiques, probabilites", exercice: "Problemes et recherche", pratique: "Projets et exposition orale" },
  "5E": { t1: "Methodes et strategies", t2: "Grandeurs et mesures", t3: "Bilan et projets", titre: "Programme 5E", objectif: "Developper les methodes de resolution", notion: "Strategies de calcul, mesures, geometrie", exercice: "Exercices methodologiques", pratique: "Experiences et projets courts" },
  "4A": { t1: "Nombres et calculs", t2: "Geometrie dans l'espace", t3: "Projet et evaluation", titre: "Programme 4A", objectif: "Maitriser les nombres rationnels", notion: "Fractions, relatifs, geometrie dans l'espace", exercice: "Exercices de maitrise", pratique: "Travaux pratiques et modelisation" },
  "4B": { t1: "Expressions algebriques", t2: "Statistiques et probabilites", t3: "Projet et bilan", titre: "Programme 4B", objectif: "Manipuler les expressions algebriques", notion: "Developpement, facteur commun, statistiques", exercice: "Exercices de manipulation", pratique: "Enquetes et presentation de donnees" },
  "4C": { t1: "Equations et inequations", t2: "Triangles et cercles", t3: "Evaluation integree", titre: "Programme 4C", objectif: "Resoudre des equations", notion: "Equations, Inequations, triangles, cercles", exercice: "Problemes et demonstrations", pratique: "Constructions geometriques et projets" },
  "4D": { t1: "Proportionnalite avancee", t2: "Fonctions et representations", t3: "Synthese", titre: "Programme 4D", objectif: "Comprendre la proportionnalite et les fonctions", notion: "Pourcentages, fonctions affines, representations", exercice: "Etude de fonctions et pourcentages", pratique: "Modelisation et projets numeriques" },
  "4E": { t1: "Calcul et numeration", t2: "Geometrie et grandeurs", t3: "Bilan et evaluation", titre: "Programme 4E", objectif: "Approfondir le calcul numerique", notion: "Racines carrees, puissances, geometrie", exercice: "Exercices d'approfondissement", pratique: "Projets et activites experimentales" },
  "3A": { t1: "Nombres reels et puissances", t2: "Geometrie plane", t3: "Projet et evaluation", titre: "Programme 3A", objectif: "Manipuler les nombres reels", notion: "Nombres reels, puissances, theoremes geometrie", exercice: "Demonstrations et calculs", pratique: "Projets de recherche et presentations" },
  "3B": { t1: "Trigonometrie", t2: "Equations et systemes", t3: "Bilan integre", titre: "Programme 3B", objectif: "Applique la trigonometrie", notion: "Trigonometrie, systemes d'equations, fonctions", exercice: "Resolution de systemes et calculs trigo", pratique: "Modelisation et projets multidisciplinaires" },
  "3C": { t1: "Statistiques et probabilites", t2: "Fonctions derivees", t3: "Projet final", titre: "Programme 3C", objectif: "Analyser des donnees statistiques", notion: "Statistiques, probabilites, derivees", exercice: "Analyse de series statistiques", pratique: "Etude de cas et presentations" },
  "3D": { t1: "Geometrie dans l'espace", t2: "Algebre lineaire", t3: "Evaluation et synthese", titre: "Programme 3D", objectif: "Maitriser la geometrie dans l'espace", notion: "Vecteurs, droites, plans, algebre lineaire", exercice: "Exercices vectoriels et geometrie", pratique: "Projets et modelisation spatiale" },
  "3E": { t1: "Calcul differentiel", t2: "Nombres complexes", t3: "Projet et bilan", titre: "Programme 3E", objectif: "Initiation au calcul differentiel", notion: "Limites, derivees, nombres complexes", exercice: "Etude de fonctions et complexes", pratique: "Projets numeriques et simulations" },
  "2L1": { t1: "Analyse et fonctions", t2: "Geometrie et vecteurs", t3: "Evaluation", titre: "Programme 2L1", objectif: "Consolider l'analyse", notion: "Limites, derivees, integrales, vecteurs", exercice: "Etude de fonctions et courbes", pratique: "Modelisation et projets experimentaux" },
  "2L2": { t1: "Algebre et matrices", t2: "Probabilites", t3: "Projet interdisciplinaire", titre: "Programme 2L2", objectif: "Maitriser l'algebre lineaire", notion: "Matrices, determinant, probabilites", exercice: "Systemes lineaires et probabilites", pratique: "Projets et analyse de donnees" },
  "2OSE": { t1: "Electronique et signaux", t2: "Algorithmique", t3: "Projet technique", titre: "Programme 2OSE", objectif: "Analyser des signaux et systemes", notion: "Signaux, circuits, algorithmique", exercice: "Simulations et programmation", pratique: "Projets techniques et experimentations" },
  "2nde": { t1: "Fonctions et derivees", t2: "Equations et systemes", t3: "Projet et evaluation", titre: "Programme 2nde", objectif: "Acquerir les methodes de base", notion: "Fonctions, derivees, equations, statistiques", exercice: "Exercices de comprehension", pratique: "Enquetes et projets courts" },
  "1ère": { t1: "Suites numeriques", t2: "Fonctions exponentielles", t3: "Evaluation integree", titre: "Programme 1ère", objectif: "Comprendre les suites et fonctions", notion: "Suites, exponentielle, logarithmes, integrales", exercice: "Etudes de suites et fonctions", pratique: "Modelisation et projets de specialite" },
  "PL1": { t1: "Methodes numeriques", t2: "Statistiques avancees", t3: "Projet et presentation", titre: "Programme PL1", objectif: "Appliquer les methodes numeriques", notion: "Methodes numeriques, statistiques, algorithmes", exercice: "Calculs numeriques et simulations", pratique: "Projets de programmation" },
  "PL2": { t1: "Modelisation mathematique", t2: "Analyse de donnees", t3: "Evaluation et bilan", titre: "Programme PL2", objectif: "Modeliser des phenomenes reels", notion: "Modelisation, analyse de donnees, graphes", exercice: "Modeles mathematiques et simulations", pratique: "Projets et presentations orales" },
  "POSE": { t1: "Systemes et automatique", t2: "Methodes avancees", t3: "Projet technique final", titre: "Programme POSE", objectif: "Maitriser les systemes automatiques", notion: "Automatique, asservissements, methodes", exercice: "Simulations et analyses de systemes", pratique: "Projets de conception et realisation" },
  "PS1": { t1: "Programmation et algorithmes", t2: "Structures de donnees", t3: "Projet et evaluation", titre: "Programme PS1", objectif: "Developper des algorithmes", notion: "Algorithmique, structures de donnees, complexite", exercice: "Programmation et optimisation", pratique: "Projets de developpement logiciel" },
  "Tle": { t1: "Analyse avancee", t2: "Probabilites et statistiques", t3: "Projet et evaluation nationale", titre: "Programme Tle", objectif: "Reviser et approfondir pour le bac", notion: "Analyse, probabilites, statistiques, specialites", exercice: "Annales et exercices types bac", pratique: "Projets de specialite et etudes de cas" },
  "TL": { t1: "Methodes de l'ingenieur", t2: "Modelisation et simulation", t3: "Projet technique", titre: "Programme TL", objectif: "Appliquer les mathematiques a l'ingenierie", notion: "Methodes numeriques, modelisation, simulation", exercice: "Calculs d'ingenieur et simulations", pratique: "Projets techniques et realisations" },
  "TOSE": { t1: "Automatique et commande", t2: "Systemes embarques", t3: "Projet final", titre: "Programme TOSE", objectif: "Concevoir des systemes automatises", notion: "Commande, regulation, systemes embarques", exercice: "Etudes de systemes et simulations", pratique: "Projets de conception et realisation" },
  "TS1": { t1: "Signaux et telecommunications", t2: "Reseaux et protocoles", t3: "Evaluation et projets", titre: "Programme TS1", objectif: "Comprendre les telecommunications", notion: "Signaux, modulations, reseaux, protocoles", exercice: "Analyse de signaux et configurations", pratique: "Projets de telecommunications" },
  "TS2": { t1: "Systemes informatiques", t2: "Securite et maintenance", t3: "Projet final technique", titre: "Programme TS2", objectif: "Maitriser la maintenance informatique", notion: "Hardware, software, securite, maintenance", exercice: "Diagnostics et resolutions de pannes", pratique: "Projets de maintenance et deploiement" },
};

const insertTrimestre = sqlite.prepare(
  `INSERT OR IGNORE INTO trimestres (id, numero, lecon, matiereId, enseignantId, classeId, examen1, examen2, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertCahier = sqlite.prepare(
  `INSERT OR IGNORE INTO cahiers (id, titre, objectif, notion, exercice, pratique, trimestreId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

let inserted = 0;

for (const classe of classes) {
  const cid = String(classe.id);
  if (existing.has(cid)) continue;

  const label = classe.label;
  const content = contentByLevel[label];
  if (!content) {
    console.log("No content mapping for " + label);
    continue;
  }

  for (let num = 1; num <= 3; num++) {
    const trimestreId = "trimestre-seed-" + cid + "-" + num;
    const lecon = num === 1 ? content.t1 : num === 2 ? content.t2 : content.t3;
    const examen1 = "Evaluation " + num + " pour " + label + ": " + lecon;
    const examen2 = "Travail pratique " + num + " pour " + label;

    insertTrimestre.run(trimestreId, num, lecon, matiereId, enseignantId, cid, examen1, examen2, now(), now());

    const cahierId = "cahier-seed-" + cid + "-" + num;
    insertCahier.run(cahierId, JSON.stringify([{ id: 1, label: content.titre }]), JSON.stringify([{ id: 1, label: content.objectif }]), JSON.stringify([{ id: 1, label: content.notion }]), JSON.stringify([{ id: 1, label: content.exercice }]), JSON.stringify([{ id: 1, label: content.pratique }]), trimestreId, now(), now());

    inserted++;
  }
}

console.log("Inserted " + inserted + " trimestres with cahiers and lecons");
sqlite.close();
