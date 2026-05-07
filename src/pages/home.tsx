import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useOutletContext } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { file } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { FileToolbar, type ViewMode } from "@/components/file-browser/file-toolbar";
import { FileBrowser } from "@/components/file-browser/file-browser";
import type { UserLayoutContext } from "@/components/layout/user-layout";

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

export default function HomePage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const path = params["*"] || "";
  const { headerSlot } = useOutletContext<UserLayoutContext>();

  const { data: directory = null, isLoading: loading } = useQuery({
    queryKey: queryKeys.directory(path),
    queryFn: () => path
      ? file.getDirectoryByPath(path)
      : file.getRootDirectory(),
  });

  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("disknext-view-mode", "list");
  const [showThumb, setShowThumb] = useLocalStorage("disknext-show-thumb", true);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.directory(path) });
  }, [queryClient, path]);

  return (
    <>
      {headerSlot && createPortal(
        <FileToolbar
          path={path}
          viewMode={viewMode}
          showThumb={showThumb}
          onViewModeChange={setViewMode}
          onShowThumbChange={setShowThumb}
        />,
        headerSlot,
      )}
      <FileBrowser
        directory={directory}
        viewMode={viewMode}
        showThumb={showThumb}
        loading={loading}
        path={path}
        onRefresh={handleRefresh}
      />
    </>
  );
}
