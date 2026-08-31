import { useState } from "react";

/**
 * Réglages d'affichage de l'éditeur Monaco dans code-ide.tsx : taille de
 * police, retour à la ligne, thème et position du curseur. Ce sous-ensemble
 * d'état est totalement indépendant de l'arbre de fichiers / terminal / onglets
 * (il n'est lu que par le composant Editor et la barre de statut), donc il
 * peut être extrait sans changer aucun comportement.
 */
export function useEditorSettings() {
  const [wordWrap, setWordWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const toggleWordWrap = () => setWordWrap((prev) => !prev);
  const decreaseFontSize = () =>
    setFontSize((prev) => Math.max(10, prev - 1));
  const increaseFontSize = () =>
    setFontSize((prev) => Math.min(24, prev + 1));
  const toggleEditorTheme = () =>
    setEditorTheme((prev) => (prev === "vs-dark" ? "vs-light" : "vs-dark"));

  return {
    wordWrap,
    fontSize,
    editorTheme,
    cursorPosition,
    setCursorPosition,
    toggleWordWrap,
    decreaseFontSize,
    increaseFontSize,
    toggleEditorTheme,
  };
}
