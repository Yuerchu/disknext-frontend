import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { trash, ApiError } from "@/api";
import type { TrashItemResponse } from "@/api";
import { TrashBrowser } from "@/components/file-browser/trash-browser";
import type { ViewMode } from "@/components/file-browser/file-toolbar";

function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try { return JSON.parse(stored) as T; } catch { /* ignore */ }
    }
    return defaultValue;
  });

  const set = useCallback((v: T) => {
    setValue(v);
    localStorage.setItem(key, JSON.stringify(v));
  }, [key]);

  return [value, set];
}

export default function TrashPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TrashItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode] = useLocalStorage<ViewMode>("disknext-trash-view-mode", "list");
  const [showThumb] = useLocalStorage("disknext-trash-show-thumb", false);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trash.list();
      setItems(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("common.loading");
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  return (
    <TrashBrowser
      items={items}
      viewMode={viewMode}
      showThumb={showThumb}
      loading={loading}
      onRefresh={loadTrash}
    />
  );
}
