import Database from "better-sqlite3";
import db from "../db.json" assert { type: "json" };
import cahiersDb from "./db-cahiers.json" assert { type: "json" };
import quizData from "./quiz-informatique.json" assert { type: "json" };
import bcrypt from "bcryptjs";

const sqlite = new Database("./dev.db");
sqlite.pragma("foreign_keys = OFF");

const now = new Date().toISOString().replace("T", " ").replace("Z", "");

function esc(v: any): string {
  if (v === null || v === undefined) return "NULL";
  if (v === true) return "1";
  if (v === false) return "0";
  if (typeof v === "number") return v.toString();
  if (v instanceof Date) return `'${v.toISOString().replace("T", " ").replace("Z", "")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function getTableColumns(table: string): Set<string> {
  const cols = sqlite.prepare(`PRAGMA table_info("${table}")`).all() as any[];
  return new Set(cols.map((c) => c.name));
}

function insertOrReplace(table: string, idCol: string, idVal: string, data: Record<string, any>) {
  const existingCols = getTableColumns(table);
  const cols = Object.keys(data).filter((c) => existingCols.has(c));
  if (cols.length === 0) return;
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const valList = cols.map((c) => esc(data[c])).join(", ");
  const safeId = String(idVal).replace(/'/g, "''");
  const sql = `INSERT OR REPLACE INTO "${table}" ("${idCol}", ${colList}) VALUES ('${safeId}', ${valList})`;
  sqlite.prepare(sql).run();
}

function insertOrIgnore(table: string, idCol: string, idVal: string, data: Record<string, any>) {
  const existingCols = getTableColumns(table);
  const cols = Object.keys(data).filter((c) => existingCols.has(c));
  if (cols.length === 0) return;
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const valList = cols.map((c) => esc(data[c])).join(", ");
  const safeId = String(idVal).replace(/'/g, "''");
  const sql = `INSERT OR IGNORE INTO "${table}" ("${idCol}", ${colList}) VALUES ('${safeId}', ${valList})`;
  sqlite.prepare(sql).run();
}

function ensureColumn(table: string, column: string, type: string) {
  const cols = sqlite.prepare(`PRAGMA table_info("${table}")`).all() as any[];
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    sqlite.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
  }
}

async function ensureColumns(table: string, columns: Record<string, string>) {
  const cols = sqlite.prepare(`PRAGMA table_info("${table}")`).all() as any[];
  const existing = new Set(cols.map((c) => c.name));
  for (const [column, type] of Object.entries(columns)) {
    if (!existing.has(column)) {
      sqlite.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
    }
  }
}

async function main() {
  console.log("🚀 Migration db.json → SQLite");

  sqlite.pragma("foreign_keys = OFF");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "titres_lecons" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "label" TEXT NOT NULL,
      "examen1" TEXT,
      "examen2" TEXT,
      "enseignantId" TEXT NOT NULL,
      "matiereId" TEXT NOT NULL,
      "trimestreId" TEXT NOT NULL,
      "classeId" TEXT NOT NULL,
      "deleted" BOOLEAN NOT NULL DEFAULT false,
      "handledById" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "deletedAt" DATETIME,
      "restoredAt" DATETIME
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "quizs" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "question" TEXT NOT NULL,
      "reponse" TEXT NOT NULL,
      "difficulte" INTEGER,
      "done" BOOLEAN NOT NULL DEFAULT false,
      "enseignantId" TEXT NOT NULL,
      "matiereId" TEXT NOT NULL,
      "usualClasseId" TEXT NOT NULL,
      "classe" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "exercices" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "titre" TEXT NOT NULL,
      "consigne" TEXT NOT NULL,
      "difficulte" INTEGER NOT NULL DEFAULT 1,
      "classe" TEXT,
      "enseignantId" TEXT NOT NULL,
      "matiereId" TEXT,
      "usualClasseId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);

  const tablesToClear = [
    "auth_sessions", "user_state_pages", "notes", "repartitions",
    "eleves", "grilles_emploi_temps", "enseignants", "matieres",
    "classes", "horaires", "dates_hebdo", "examens", "lecons",
    "cahiers", "trimestres", "emploi_du_temps_eleves", "titres_lecons",
    "quizs", "exercices"
  ];

  for (const table of tablesToClear) {
    try {
      sqlite.exec(`DELETE FROM "${table}"`);
    } catch {
      console.warn(`⚠️ Table ${table} not found, skipping`);
    }
  }

  if (!db.roles) db.roles = [];
  if (!db.users) db.users = [];
  if (!db.sessions) db.sessions = [];
  if (!db.matieres) db.matieres = [];
  if (!db.classeType) db.classeType = [];
  if (!db.classesCategories) db.classesCategories = [];
  if (!db.lieuxecoles) db.lieuxecoles = [];
  if (!db.genresEleve) db.genresEleve = [];
  if (!db.classes) db.classes = [];
  if (!db.enseignants) db.enseignants = [];
  if (!db.horaires) db.horaires = [];
  if (!db.eleves) db.eleves = [];
  if (!db.repartitions) db.repartitions = [];
  if (!db.dateshebdo) db.dateshebdo = [];
  if (!db.titres_lecons) db.titres_lecons = [];

  // --- ROLES ---
  console.log("📥 Rôles...");
  const roleMap = new Map<string, string>();
  for (const r of db.roles) {
    insertOrReplace("roles", "id", r.id, { label: r.label });
    roleMap.set(r.id, r.id);
  }

  // --- ANNÉES SCOLAIRES ---
  console.log("📥 Sessions...");
  if (db.sessions && db.sessions.length > 0) {
    for (const s of db.sessions) {
      insertOrReplace("sessions", "id", s.id.toString(), {
        year: s.year,
        "sessionYearSchoolSM": s.sessionYearSchoolSM,
        "sessionYearSchoolLG": s.sessionYearSchoolLG,
      });
    }
  }

  // --- SEMAINES ---
  console.log("📥 Semaines...");
  if (db.weeks && db.weeks.length > 0) {
    for (const w of db.weeks) {
      insertOrReplace("weeks", "id", w.id, { day: w.day });
    }
  }

  // --- MATIÈRES ---
  console.log("📥 Matières...");
  const matiereMap = new Map<string, string>();
  for (const m of db.matieres) {
    insertOrReplace("matieres", "id", m.id, {
      label: m.label,
      abrev: m.abrev || null,
      coeff: m.coeff || null,
      deleted: m.deleted || false,
      createdAt: now,
      updatedAt: now,
    });
    matiereMap.set(m.id, m.id);
  }

  // --- CLASSE TYPES ---
  console.log("📥 Types de classe...");
  for (const ct of db.classeType) {
    insertOrReplace("classe_types", "id", ct.id, { label: ct.label });
  }

  // --- CLASSE CATEGORIES ---
  console.log("📥 Catégories de classe...");
  for (const cc of db.classesCategories) {
    insertOrReplace("classes_categories", "id", cc.id, { label: cc.label });
  }

  // --- LIEUX ÉCOLES ---
  console.log("📥 Lieux d'école...");
  for (const l of db.lieuxecoles) {
    const taux = l.taux ? parseFloat(l.taux) : null;
    insertOrReplace("lieux_ecoles", "id", l.id, {
      label: l.labellieu,
      color: l.color || null,
      taux,
    });
  }

  // --- GENRES ---
  console.log("📥 Genres...");
  for (const g of db.genresEleve) {
    insertOrReplace("genres_eleve", "id", g.id, { label: g.label, gen: g.gen });
  }

  // --- CLASSES ---
  console.log("📥 Classes...");
  for (const c of db.classes) {
    insertOrReplace("classes", "id", c.id, {
      label: c.label,
      "classeTypeId": c.cltypeId || null,
      "categorieId": c.cat || null,
      "lieuId": c.lieu || null,
      deleted: c.deleted || false,
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- UTILISATEURS ---
  console.log("📥 Utilisateurs...");
  ensureColumn("users", "resetToken", "TEXT");
  ensureColumn("users", "resetTokenExpires", "TEXT");
  for (const u of db.users) {
    const roleId = u.role ? roleMap.get(u.role) || null : null;
    const hashedPassword = bcrypt.hashSync(u.password || "", 10);
    insertOrReplace("users", "id", u.id, {
      username: u.username,
      email: u.email,
      password: hashedPassword,
      image: u.image || null,
      destination: u.destination || null,
      "roleId": roleId,
      session: u.session || 0,
      logged: u.logged || false,
      resetToken: null,
      resetTokenExpires: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- ENSEIGNANTS ---
  console.log("📥 Enseignants...");
  for (const e of db.enseignants) {
    insertOrReplace("enseignants", "id", e.id, {
      nom: e.nom,
      prenom: e.prenom,
      contact: e.contact || null,
      adresse: e.adresse || null,
      "dpservice": e.dpservice || null,
      "profSess": e.profSess || null,
      photo: e.photo || null,
      "matiereId": e.matiere ? matiereMap.get(e.matiere) || null : null,
      "categorieId": e.categ || null,
      "handledById": e.handledBy || null,
      deleted: e.deleted || false,
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- HORAIRES ---
  console.log("📥 Horaires...");
  for (const h of db.horaires) {
    insertOrReplace("horaires", "id", h.id, {
      hour: h.hour,
      "hour2": h.hour2 || null,
      visible: h.visible !== undefined ? h.visible : true,
      type: h.type,
    });
  }

  if (!db.eleves) db.eleves = [];
  if (!db.enseignants) db.enseignants = [];
  if (!db.repartitions) db.repartitions = [];
  if (!db.dateshebdo) db.dateshebdo = [];
  if (!db.grillesEmploiTemps) db.grillesEmploiTemps = [];
  if (!db.cahiers) db.cahiers = [];
  if (!db.emploiDuTempsEleves) db.emploiDuTempsEleves = [];

  // --- ÉLÈVES ---
  console.log("📥 Élèves...");
  for (const e of db.eleves) {
    insertOrReplace("eleves", "id", e.id, {
      firstname: e.firstname,
      lastname: e.lastname,
      dob: e.dob || null,
      sob: e.sob || null,
      age: e.age || null,
      domic: e.domic || null,
      contact: e.contact || null,
      numero: e.numero || null,
      obs: e.obs || null,
      cas: e.cas || false,
      photo: e.photo || null,
      anscol: e.anscol || null,
      classeId: e.classeId || null,
      classeTypeId: e.cltypeId || null,
      genreId: e.genreId || null,
      handledById: e.handledBy || null,
      deleted: e.deleted || false,
      createdAt: now,
      updatedAt: now,
      deletedAt: e.deletedAt || null,
      restoredAt: e.restoredAt || null,
    });
  }

  // --- ENSEIGNANTS ---
  console.log("📥 Enseignants...");
  for (const e of db.enseignants) {
    insertOrReplace("enseignants", "id", e.id, {
      nom: e.nom,
      prenom: e.prenom,
      contact: e.contact || null,
      adresse: e.adresse || null,
      "dpservice": e.dpservice || null,
      "profSess": e.profSess || null,
      photo: e.photo || null,
      "matiereId": e.matiere ? matiereMap.get(e.matiere) || null : null,
      "categorieId": e.categ || null,
      "handledById": e.handledBy || null,
      deleted: e.deleted || false,
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- GRILLES EMPLOI DU TEMPS ---
  console.log("📥 Grilles EDT...");
  ensureColumn("grilles_emploi_temps", "date", "DATETIME");
  ensureColumn("grilles_emploi_temps", "jour", "INTEGER");
  for (const g of db.grillesEmploiTemps) {
    const dateObj = g.date ? new Date(g.date) : null;
    const jour = dateObj ? (dateObj.getDay() + 6) % 7 : null;
    insertOrReplace("grilles_emploi_temps", "id", g.id, {
      position: g.position,
      date: g.date || null,
      jour,
      annee: g.annee || null,
      enseignantId: g.enseignantId || null,
      matiereId: g.matiereId || null,
      classeId: g.classeId || null,
      lieuId: g.lieuId || null,
      horaireId: g.horaireId || null,
    });
  }

  // --- RÉPARTITIONS ---
  console.log("📥 Répartitions...");
  for (const r of db.repartitions) {
    const rawStatut = r.statut ?? "NON_FAIT";
    const normalizedStatut =
      rawStatut === "0" || rawStatut === 0 || !rawStatut
        ? "NON_FAIT"
        : String(rawStatut).toUpperCase();

    insertOrReplace("repartitions", "id", r.id, {
      numItem: r.numItem || null,
      annee: r.annee || null,
      monthId: r.monthId || null,
      day: r.day || null,
      date: r.date || null,
      position: r.position || null,
      taux: r.taux ? parseFloat(r.taux) : null,
      statut: normalizedStatut,
      matiereId: r.matiereId || null,
      enseignantId: r.enseignantId || null,
      classeId: r.classeId || null,
      semaineId: r.periodeId || null,
      hourId: r.hourId || null,
      lieuId: r.lieuId || null,
      deleted: r.deleted || false,
      handledById: r.handledBy || null,
      createdAt: now,
      updatedAt: now,
      deletedAt: r.deletedAt || null,
      restoredAt: r.restoredAt || null,
    });
  }

  // --- DATES HEBDO ---
  console.log("📥 Dates hebdo...");
  for (const d of db.dateshebdo) {
    insertOrReplace("dates_hebdo", "id", d.id, {
      dateStart: d.dateStart || d.dateDebut || null,
      dateEnd: d.dateEnd || d.dateFin || null,
    });
  }

  // --- NOTES ---
  console.log("📥 Notes...");
  const notes = db.notes || [];
  for (const n of notes) {
    insertOrReplace("notes", "id", n.id, {
      eleveId: n.eleveId || null,
      profId: n.profId || null,
      matiereId: n.matiereId || null,
      note1: n.note1 || null,
      note2: n.note2 || null,
      note3: n.note3 || null,
      note4: n.note4 || null,
      note5: n.note5 || null,
    });
  }

  // --- TRIMESTRES / CAHIERS / LECONS / EXAMENS ---
  console.log("📥 Trimestres...");
  const trimestresDb = db.trimestres || [];
  for (const trim of trimestresDb) {
    insertOrReplace("trimestres", "id", trim.id, {
      numero: trim.numero || 0,
      label: trim.label || null,
      matiere: trim.matiere || null,
      color: trim.color || null,
    });
  }

  console.log("📥 Cahiers...");
  const cahiersData = Array.isArray(cahiersDb) ? cahiersDb : (cahiersDb.cahiers || []);
  for (const cahierData of cahiersData) {
    let classeId: string | null = null;
    const classeRow = sqlite.prepare('SELECT id FROM classes WHERE label = ?').get(cahierData.classe) as any;
    if (classeRow) {
      classeId = classeRow.id;
    } else {
      classeId = `classe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      insertOrIgnore("classes", "id", classeId, {
        label: cahierData.classe,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    let matiereId: string | null = null;
    const matiereRow = sqlite.prepare('SELECT id FROM matieres WHERE label = ?').get(cahierData.matiere) as any;
    if (matiereRow) {
      matiereId = matiereRow.id;
    } else {
      matiereId = `matiere-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      insertOrIgnore("matieres", "id", matiereId, {
        label: cahierData.matiere,
        abrev: cahierData.matiere.slice(0, 3).toUpperCase(),
        deleted: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    const trimestres = cahierData.trimestres || [];
    for (const trimData of trimestres) {
      const trimestreRow = sqlite.prepare('SELECT id FROM trimestres WHERE numero = ? AND matiere = ?').get(trimData.numero, trimData.matiere) as any;
      let trimestreId = trimestreRow ? trimestreRow.id : null;
      if (!trimestreId) {
        trimestreId = `trimestre-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        insertOrIgnore("trimestres", "id", trimestreId, {
          numero: trimData.numero,
          label: trimData.label || null,
          matiere: trimData.matiere || null,
          color: trimData.color || null,
        });
      }

      const cahierId = `cahier-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      insertOrIgnore("cahiers", "id", cahierId, {
        titre: cahierData.titre || `${cahierData.classe} - ${trimData.label}`,
        description: cahierData.description || null,
        classeId: classeId,
        matiereId: matiereId,
        trimestreId: trimestreId,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      });

      const lessons = trimData.lessons || [];
      ensureColumn("lecons", "titreLeconId", "TEXT");
      for (const lesson of lessons) {
        const leconId = `lecon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        insertOrIgnore("lecons", "id", leconId, {
          numero: lesson.numero || 0,
          titre: lesson.titre || "",
          objectifs: lesson.objectifs || null,
          notions: lesson.notions || null,
          exercice: lesson.exercice || null,
          pratique: lesson.pratique || null,
          cahierId: cahierId,
          titreLeconId: lesson.titreLeconId || null,
          deleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      const exams = trimData.exams || [];
      for (const exam of exams) {
        const examenId = `examen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        insertOrIgnore("examens", "id", examenId, {
          titre: exam.titre || "",
          description: exam.description || null,
          cahierId: cahierId,
          deleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  // --- TITRES LECONS ---
  console.log("📥 Titres leçons...");
  const titresLecons = db.titres_lecons || [];
  for (const tl of titresLecons) {
    insertOrReplace("titres_lecons", "id", tl.id, {
      label: tl.label || "",
      examen1: tl.examen1 || null,
      examen2: tl.examen2 || null,
      enseignantId: tl.enseignantId || null,
      matiereId: tl.matiereId || null,
      trimestreId: tl.trimestreId || null,
      classeId: tl.classeId || null,
      deleted: tl.deleted || false,
      handledById: tl.handledById || null,
      createdAt: tl.createdAt || now,
      updatedAt: tl.updatedAt || now,
      deletedAt: tl.deletedAt || null,
      restoredAt: tl.restoredAt || null,
    });
  }

  // --- EMPLOI DU TEMPS ÉLÈVES ---
  console.log("📥 EDT Élèves...");
  ensureColumn("emploi_du_temps_eleves", "jour", "INTEGER DEFAULT 0");
  const edtEleves = db.emploiDuTempsEleves || [];
  for (const e of edtEleves) {
    insertOrReplace("emploi_du_temps_eleves", "id", e.id, {
      eleveId: e.eleveId || null,
      position: e.position || 0,
      date: e.date || null,
      annee: e.annee || null,
      jour: e.jour ?? 0,
      matiereId: e.matiereId || null,
      classeId: e.classeId || null,
      lieuId: e.lieuId || null,
      horaireId: e.horaireId || null,
      sourceGrilleId: e.sourceGrilleId || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- USER STATE PAGES ---
  console.log("📥 User state pages...");
  const statePages = db.userStatePages || [];
  for (const sp of statePages) {
    insertOrReplace("user_state_pages", "id", sp.id, {
      userId: sp.userId || sp.idUser || null,
      page: sp.page || "",
      subPage: sp.subPage || null,
      printPage: sp.printPage || false,
      pdfView: sp.pdfView || false,
      excelView: sp.excelView || false,
      sessSelect: sp.sessSelect || false,
      isFreezed: sp.isFreezed || false,
      popupActions: sp.popupActions || false,
      itemsDeleted: sp.itemsDeleted || false,
      stateSidebar: sp.stateSidebar || false,
      btnPrintFPJ: sp.btnPrintFPJ || false,
      stateForm: sp.stateForm || false,
      grillET: sp.grillET || false,
      sessionYear: sp.sessionYear || null,
      sessionYearSchoolSM: sp.sessionYearSchoolSM || null,
      sessionYearSchoolLG: sp.sessionYearSchoolLG || null,
      idMat: sp.idMat || null,
      idProf: sp.idProf || null,
      idClasse: sp.idClasse || null,
      idClasseType: sp.idClasseType || null,
      idClasseCat: sp.idClasseCat || null,
      idDtHebdo: sp.idDtHebdo || null,
      idGenre: sp.idGenre || null,
      idLieu: sp.idLieu || null,
      idHour: sp.idHour || null,
      itemId: sp.itemId || null,
      typeForm: sp.typeForm || null,
      dateFrom: sp.dateFrom || null,
      dateTo: sp.dateTo || null,
      datePointage: sp.datePointage || null,
      sidebarClass: sp.sidebarClass || null,
      labelBC: sp.labelBC ? JSON.stringify(sp.labelBC) : null,
    });
  }

  // --- SESSIONS ---
  console.log("📥 Sessions...");
  const sessions = db.sessions || [];
  for (const s of sessions) {
    insertOrReplace("auth_sessions", "id", s.id, {
      userId: s.userId || null,
      token: s.token || "",
      expires: s.expires || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- QUIZ ---
  console.log("📥 Quiz...");
  const quizs = Array.isArray(quizData) ? quizData : [];
  for (const q of quizs) {
    insertOrReplace("quizs", "id", q.id, {
      question: q.question,
      reponse: q.reponse,
      difficulte: q.difficulte || null,
      done: q.done || false,
      enseignantId: q.enseignantId,
      matiereId: q.matiereId,
      usualClasseId: q.usualClasseId,
      classe: q.classe,
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- EXERCICES ---
  console.log("📥 Exercices...");
  const exercicesData = (db.exercices || []) as any[];
  for (const ex of exercicesData) {
    insertOrReplace("exercices", "id", ex.id, {
      titre: ex.titre || "",
      consigne: ex.consigne || "",
      difficulte: ex.difficulte || 1,
      classe: ex.classe || null,
      enseignantId: ex.enseignantId || "",
      matiereId: ex.matiereId || null,
      usualClasseId: ex.usualClasseId || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Re-enable FK
  sqlite.pragma("foreign_keys = ON");
  sqlite.close();
  console.log("\n✅ Migration terminée avec succès !");
}

main().catch((e) => {
  console.error("❌ Erreur de migration :", e);
  sqlite.close();
  process.exit(1);
});
