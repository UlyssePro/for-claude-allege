import Database from "better-sqlite3";

const sqlite = new Database("./dev.db");

function esc(v: any): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return v.toString();
  if (typeof v === "boolean") return v ? "1" : "0";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insertOrIgnore(table: string, data: Record<string, any>) {
  const cols = Object.keys(data);
  const vals = cols.map((c) => esc(data[c]));
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const sql = `INSERT OR IGNORE INTO "${table}" (${colList}) VALUES (${vals.join(", ")})`;
  sqlite.prepare(sql).run();
}

async function main() {
  const languages = [
    { id: "lang-html", label: "HTML", code: "html" },
    { id: "lang-css", label: "CSS", code: "css" },
    { id: "lang-js", label: "JavaScript", code: "js" },
    { id: "lang-ts", label: "TypeScript", code: "ts" },
    { id: "lang-py", label: "Python", code: "py" },
    { id: "lang-php", label: "PHP", code: "php" },
  ];

  for (const lang of languages) {
    insertOrIgnore("languages", {
      ...lang,
      createdAt: new Date().toISOString().replace("T", " ").replace("Z", ""),
      updatedAt: new Date().toISOString().replace("T", " ").replace("Z", ""),
    });
    console.log(`Seeded language: ${lang.label}`);
  }

  const codings = [
    { id: "coding-1", languageId: "lang-html", name: "Input", type: "html", element: "<input>", explication: "Définit un champ de saisie dans un formulaire HTML." },
    { id: "coding-2", languageId: "lang-html", name: "Div", type: "html", element: "<div>", explication: "Conteneur générique qui permet de structurer le contenu HTML." },
    { id: "coding-3", languageId: "lang-css", name: "Flex", type: "code", element: "display: flex", explication: "Active le modèle de boîte flexible pour aligner des éléments." },
    { id: "coding-4", languageId: "lang-js", name: "Const", type: "code", element: "const", explication: "Déclare une variable dont la valeur ne peut pas être réassignée." },
    { id: "coding-5", languageId: "lang-ts", name: "Interface", type: "code", element: "interface", explication: "Définit la structure d'un objet en TypeScript." },
    { id: "coding-6", languageId: "lang-py", name: "Def", type: "code", element: "def", explication: "Définit une fonction en Python." },
    { id: "coding-7", languageId: "lang-php", name: "Echo", type: "code", element: "echo", explication: "Affiche une chaîne de caractères en PHP." },
  ];

  for (const coding of codings) {
    insertOrIgnore("codings", {
      ...coding,
      createdAt: new Date().toISOString().replace("T", " ").replace("Z", ""),
      updatedAt: new Date().toISOString().replace("T", " ").replace("Z", ""),
    });
    console.log(`Seeded coding: ${coding.element}`);
  }

  console.log("Done seeding languages and codings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    sqlite.close();
  });
