import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trash } from "@/api";
import { TrashBrowser } from "@/components/file-browser/trash-browser";
import type { ViewMode } from "@/components/file-browser/file-toolbar";
import { queryKeys } from "@/lib/query-keys";

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
  const queryClient = useQueryClient();
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.trash(),
    queryFn: trash.list,
  });
  const [viewMode] = useLocalStorage<ViewMode>("disknext-trash-view-mode", "list");
  const [showThumb] = useLocalStorage("disknext-trash-show-thumb", false);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trash() });
  }, [queryClient]);

  return (
    <TrashBrowser
      items={items}
      viewMode={viewMode}
      showThumb={showThumb}
      loading={loading}
      onRefresh={handleRefresh}
    />
  );
}
