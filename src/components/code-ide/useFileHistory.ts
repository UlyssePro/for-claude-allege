import { useCallback, useState } from "react";

/**
 * Fichiers favoris et récemment ouverts dans l'IDE. État autonome : ne lit
 * ni n'écrit l'arbre de fichiers, uniquement des listes de chemins.
 */
export function useFileHistory() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  const toggleFavorite = useCallback((path: string) => {
    setFavorites((prev) => {
      if (prev.includes(path)) {
        return prev.filter((p) => p !== path);
      }
      return [...prev, path];
    });
  }, []);

  const addToRecentFiles = useCallback((path: string) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((p) => p !== path);
      return [path, ...filtered].slice(0, 10);
    });
  }, []);

  return { favorites, recentFiles, toggleFavorite, addToRecentFiles };
}
