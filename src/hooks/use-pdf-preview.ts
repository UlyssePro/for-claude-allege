import { useCallback, useState } from "react";

interface PdfLike {
  output(type: "arraybuffer"): ArrayBuffer;
}

/**
 * État partagé par toutes les pages qui affichent un export PDF dans un
 * overlay plein écran (modePdf/pdfUrl + nettoyage du blob URL).
 */
export function usePdfPreview() {
  const [modePdf, setModePdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const openPdf = useCallback((doc: PdfLike) => {
    const pdfBytes = doc.output("arraybuffer");
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    setPdfUrl(blobUrl);
    setModePdf(true);
  }, []);

  const closePdf = useCallback(() => {
    setModePdf(false);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  return { modePdf, pdfUrl, openPdf, closePdf };
}
