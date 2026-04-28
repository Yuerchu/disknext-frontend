import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useOutletContext } from "react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { file } from "@/api";
import { ApiError } from "@/api";
import type { DirectoryResponse } from "@/api";
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
  const { t } = useTranslation();
  const params = useParams();
  const path = params["*"] || "";
  const { headerSlot } = useOutletContext<UserLayoutContext>();

  const [directory, setDirectory] = useState<DirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("disknext-view-mode", "list");
  const [showThumb, setShowThumb] = useLocalStorage("disknext-show-thumb", true);

  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    try {
      const data = dirPath
        ? await file.getDirectoryByPath(dirPath)
        : await file.getRootDirectory();
      setDirectory(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("file.loadFailed");
      toast.error(msg);
      setDirectory(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDirectory(path);
  }, [path, loadDirectory]);

  const handleRefresh = useCallback(() => {
    loadDirectory(path);
  }, [path, loadDirectory]);

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
