// jsPDF est importé dynamiquement par les pages (bundle splitting), donc on
// type ici en `any` plutôt que d'importer le type, pour ne pas forcer le
// chargement statique de la lib partout où ce fichier est importé.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsPdfDoc = any;

let cachedSessionLabel: string | null = null;

async function fetchGlobalSessionLabel(): Promise<string | null> {
  if (cachedSessionLabel) return cachedSessionLabel;
  try {
    const res = await fetch("/api/public/parametres?cle=session_scolaire");
    if (res.ok) {
      const data = await res.json();
      if (data?.valeur) {
        cachedSessionLabel = data.valeur;
        return cachedSessionLabel;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** "2025-2026" si on est après septembre, sinon "2024-2025". */
export async function getSessionLabel(): Promise<string> {
  const global = await fetchGlobalSessionLabel();
  if (global) return global;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/** Version synchrone pour compatibilité ; utilise le cache si dispo, sinon calcul dynamique. */
export function getSessionLabelSync(): string {
  if (cachedSessionLabel) return cachedSessionLabel;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export interface SchoolPdfHeaderOptions {
  /** Titre affiché en haut à droite, ex: "LISTE DES MATIERES" */
  title: string;
  /** Texte entre crochets après la session, ex: "12 MATIÈRES". Ignoré si skipSession est true. */
  countLabel?: string;
  /** Abscisse de départ du trait sous le titre (varie portrait/paysage). Défaut : 14. */
  lineStart?: number;
  /** Décalage (depuis le bord droit) de la fin du trait sous le titre. Défaut : 14. */
  lineEndOffset?: number;
  /** Abscisse du titre (par défaut 130). */
  titleX?: number;
  /** Ordonnée du titre (par défaut 19). */
  titleY?: number;
  /** Alignement du titre (par défaut "center"). Certaines pages l'affichent aligné à gauche. */
  titleAlign?: "left" | "center" | "right";
  /** Ordonnée du trait sous le titre (par défaut 21). */
  lineY?: number;
  /** Taille de police du titre (par défaut 21). Le "Bulletin de notes" en utilise 25. */
  titleFontSize?: number;
  /** Si true, n'affiche pas la ligne "SESSION : ...". Certaines pages (bulletins, listes enseignant) n'en ont pas. */
  skipSession?: boolean;
  /** Affiche le logo (par défaut true). Certaines pages élève/enseignant n'en ont pas. */
  hasLogo?: boolean;
  /** Abscisse du bloc adresse (par défaut 34, décalé pour laisser la place au logo). */
  addressX?: number;
  /** Ordonnée de la première ligne d'adresse (par défaut 14, lignes suivantes espacées de 4). */
  addressY?: number;
  /** Abscisse/ordonnée/taille de police du texte de session (par défaut 34, 24, 8). */
  sessionX?: number;
  sessionY?: number;
  sessionFontSize?: number;
  /** Si fourni, remplace la session calculée automatiquement. */
  sessionLabel?: string;
}

/**
 * Ajoute l'en-tête standard (logo, adresse de l'école, titre, session) en
 * haut de la page courante. Reproduit exactement le bloc dupliqué dans
 * chaque page d'export PDF, sans rien changer visuellement.
 */
export async function addSchoolPdfHeader(
  doc: JsPdfDoc,
  opts: SchoolPdfHeaderOptions,
): Promise<{ pageWidth: number; pageHeight: number }> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const hasLogo = opts.hasLogo ?? true;
  if (hasLogo) {
    try {
      const logoRes = await fetch("/uploads/logos/logo-memo.png");
      if (logoRes.ok) {
        const logoBlob = await logoRes.blob();
        const logoUrl = URL.createObjectURL(logoBlob);
        doc.addImage(logoUrl, "PNG", 14, 8, 18, 18);
        URL.revokeObjectURL(logoUrl);
      }
    } catch {
      // ignore logo error
    }
  }

  const addressX = opts.addressX ?? 34;
  const addressY = opts.addressY ?? 12;
  doc.setFontSize(8);
  doc.text("COLLEGE PRIVE", addressX, addressY);
  doc.text("HOUSSEN MEMORIAL SCHOOL", addressX, addressY + 4);
  doc.text("B.P 284 - TEL 034 77 401 49", addressX, addressY + 8);

  doc.setFontSize(opts.titleFontSize ?? 21);
  doc.text(opts.title, opts.titleX ?? 130, opts.titleY ?? 19, {
    align: opts.titleAlign ?? "center",
  });

  if (!opts.skipSession) {
    doc.setFontSize(opts.sessionFontSize ?? 8);
    const sessionLabel = opts.sessionLabel ?? await getSessionLabel();
    doc.text(
      `SESSION : ${sessionLabel} - [ ${opts.countLabel} ]`,
      opts.sessionX ?? 34,
      opts.sessionY ?? 24,
    );
  }

  return { pageWidth, pageHeight };
}

/**
 * Ajoute le pied de page standard (numéro de page, libellé, filigrane
 * signature en diagonale) sur toutes les pages du document.
 */
export function addSchoolPdfFooter(doc: JsPdfDoc, footerLabel: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages =
    doc.internal.getNumberOfPages?.() || doc.internal.pages?.length || 1;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i}/${totalPages}`, 14, pageHeight - 10, {
      align: "left",
    });
    doc.text(footerLabel, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.setFontStyle?.("italic") ?? doc.setFont("helvetica", "italic");
    doc.text(
      `Andlys's Creations - ${new Date().getFullYear()}`,
      pageWidth + 22,
      pageHeight - 4,
      { align: "right", angle: 90 },
    );
    doc.setFontStyle?.("normal") ?? doc.setFont("helvetica", "normal");
  }
}
