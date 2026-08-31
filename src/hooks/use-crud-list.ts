import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { showConfirmToast } from "@/lib/toast.actions";

export interface CrudMessages {
  loadError?: string;
  createSuccess?: string;
  createError?: string;
  updateSuccess?: string;
  updateError?: string;
  deleteSuccess?: string;
  deleteError?: string;
  networkError?: string;
}

function buildParams(filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params;
}

/**
 * Factorise le pattern "liste filtrable + CRUD" partagé par les pages
 * admin/enseignant (fetch avec des filtres en query params, POST/PATCH/DELETE
 * avec toasts + confirmation). `F` est la forme des filtres de la page
 * (ex: { search, sortBy, sortDir } ou { search, categorieId, lieuId }) —
 * ne change ni les endpoints ni les messages affichés par défaut.
 */
export function useCrudList<T, F extends Record<string, string>>(
  endpoint: string,
  initialFilters: F,
  messages: CrudMessages = {},
  refreshTrigger?: unknown,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<F>(initialFilters);

  const fetchItems = useCallback(
    async (f: F = filters) => {
      setLoading(true);
      try {
        const res = await fetch(`${endpoint}?${buildParams(f).toString()}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        toast.error(messages.loadError ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, messages.loadError],
  );

  useEffect(() => {
    fetchItems(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleFilterChange = (name: keyof F & string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    fetchItems(newFilters);
  };

  const createItem = async (body: unknown) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(messages.createSuccess ?? "Ajouté");
        fetchItems();
        return true;
      }
      toast.error(messages.createError ?? "Erreur lors de l'ajout");
      return false;
    } catch {
      toast.error(messages.networkError ?? "Erreur réseau");
      return false;
    }
  };

  const updateItem = async (id: string, body: unknown) => {
    try {
      const res = await fetch(`${endpoint}?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(messages.updateSuccess ?? "Modifié");
        fetchItems();
        return true;
      }
      toast.error(messages.updateError ?? "Erreur lors de la modification");
      return false;
    } catch {
      toast.error(messages.networkError ?? "Erreur réseau");
      return false;
    }
  };

  const deleteItem = async (id: string, label: string) => {
    const confirmed = await showConfirmToast({
      title: `Supprimer ${label} ?`,
      description: "Cette action est irréversible.",
      destructive: true,
    });
    if (!confirmed) return false;
    try {
      const res = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(messages.deleteSuccess ?? "Supprimé");
        fetchItems();
        return true;
      }
      toast.error(messages.deleteError ?? "Erreur lors de la suppression");
      return false;
    } catch {
      toast.error(messages.networkError ?? "Erreur réseau");
      return false;
    }
  };

  return {
    items,
    setItems,
    loading,
    filters,
    handleFilterChange,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
