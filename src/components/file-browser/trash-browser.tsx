import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SelectionArea, type SelectionEvent } from "@viselect/react";
import { FileListView } from "./file-list-view";
import { FileGridView } from "./file-grid-view";
import { FileGalleryView } from "./file-gallery-view";
import { FileContextMenu, type FileActions } from "./file-context-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Trash2 } from "lucide-react";
import { trash, resolveErrorMessage } from "@/api";
import type { EntryResponse, TrashItemResponse } from "@/api";
import type { ViewMode } from "./file-toolbar";

function trashToEntry(item: TrashItemResponse): EntryResponse {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    size: item.size,
    mime_type: null,
    thumb: false,
    created_at: item.deleted_at,
    updated_at: item.deleted_at,
    source_enabled: false,
  };
}

interface TrashBrowserProps {
  items: TrashItemResponse[];
  viewMode: ViewMode;
  showThumb: boolean;
  loading: boolean;
  onRefresh: () => void;
}

export function TrashBrowser({ items: rawItems, viewMode, showThumb, loading, onRefresh }: TrashBrowserProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number>(-1);
  const preDragSelectionRef = useRef<Set<string>>(new Set());

  // Dialog state
  const [deleteTargets, setDeleteTargets] = useState<EntryResponse[]>([]);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);

  const sortedItems = useMemo(() => {
    const entries = rawItems.map(trashToEntry);
    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        if (a.type === "folder") return -1;
        if (b.type === "folder") return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [rawItems]);

  // No navigation in trash
  const handleNavigate = useCallback(() => {}, []);

  const handleSelect = useCallback((id: string, e: React.MouseEvent) => {
    const index = sortedItems.findIndex((item) => item.id === id);

    if (e.shiftKey && lastClickedIndexRef.current >= 0) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      const newIds = new Set<string>();
      for (let i = start; i <= end; i++) {
        newIds.add(sortedItems[i]!.id);
      }
      setSelectedIds(newIds);
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      return;
    }

    lastClickedIndexRef.current = index;
  }, [sortedItems]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedItems.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [sortedItems]);

  const handleRestore = useCallback(async (entries: EntryResponse[]) => {
    try {
      await trash.restore({ ids: entries.map((e) => e.id) });
      toast.success(t("trash.restoreSuccess", { count: entries.length }));
      setSelectedIds(new Set());
      onRefresh();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    }
  }, [onRefresh, t]);

  const handlePermanentDelete = useCallback((entries: EntryResponse[]) => {
    setDeleteTargets(entries);
  }, []);

  const confirmPermanentDelete = useCallback(async () => {
    setDialogLoading(true);
    try {
      await trash.delete({ ids: deleteTargets.map((e) => e.id) });
      toast.success(t("trash.permanentDeleteSuccess", { count: deleteTargets.length }));
      setDeleteTargets([]);
      setSelectedIds(new Set());
      onRefresh();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setDialogLoading(false);
    }
  }, [deleteTargets, onRefresh, t]);

  const confirmEmptyTrash = useCallback(async () => {
    setDialogLoading(true);
    try {
      await trash.delete({ is_empty_all: true });
      toast.success(t("trash.emptyTrashSuccess"));
      setEmptyTrashOpen(false);
      setSelectedIds(new Set());
      onRefresh();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setDialogLoading(false);
    }
  }, [onRefresh, t]);

  // --- 框选事件 ---

  const handleSelectionStart = useCallback(({ event, selection }: SelectionEvent) => {
    if (!event) return;
    if ("button" in event && (event as MouseEvent).button === 2) {
      selection.cancel();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("[data-slot='checkbox']")) {
      selection.cancel();
      return;
    }
    const me = event instanceof MouseEvent ? event : null;
    if (me && (me.ctrlKey || me.metaKey)) {
      preDragSelectionRef.current = new Set(selectedIds);
    } else {
      preDragSelectionRef.current = new Set();
      setSelectedIds(new Set());
    }
  }, [selectedIds]);

  const handleSelectionMove = useCallback(({ store: { changed: { added, removed } } }: SelectionEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const el of added) {
        const id = el.getAttribute("data-entry-id");
        if (id) next.add(id);
      }
      for (const el of removed) {
        const id = el.getAttribute("data-entry-id");
        if (id && !preDragSelectionRef.current.has(id)) next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectionStop = useCallback((_e: SelectionEvent) => {}, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (!target.closest("[data-selectable]")) {
      setSelectedIds(new Set());
    }
  }, []);

  const selectedEntries = useMemo(
    () => sortedItems.filter((i) => selectedIds.has(i.id)),
    [sortedItems, selectedIds],
  );

  const actions: FileActions = useMemo(() => ({
    onRefresh,
    onNavigate: handleNavigate,
    onCreateFolder: () => {},
    onCreateFile: () => {},
    onRename: () => {},
    onDelete: () => {},
    onDownload: () => {},
    onShare: () => {},
    onRestore: handleRestore,
    onPermanentDelete: handlePermanentDelete,
    onEmptyTrash: () => setEmptyTrashOpen(true),
  }), [onRefresh, handleNavigate, handleRestore, handlePermanentDelete]);

  const viewProps = {
    items: sortedItems,
    selectedIds,
    onSelect: handleSelect,
    onNavigate: handleNavigate,
    actions,
  };

  const bgTarget = selectedIds.size > 1
    ? { type: "trash-batch" as const, count: selectedIds.size }
    : { type: "trash-empty" as const };

  return (
    <div className="flex flex-1 flex-col">
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <FileContextMenu target={{ type: "trash-empty" }} actions={actions} className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Trash2 />
                </EmptyMedia>
                <EmptyTitle>{t("trash.noTrash")}</EmptyTitle>
                <EmptyDescription>{t("trash.noTrashHint")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </FileContextMenu>
      ) : (
        <FileContextMenu target={bgTarget} actions={actions} selectedEntries={selectedEntries} className="flex flex-1 flex-col">
          <SelectionArea
            className="flex flex-1 flex-col"
            selectables="[data-selectable]"
            behaviour={{
              overlap: "keep",
              intersect: "touch",
              startThreshold: 10,
              scrolling: { speedDivider: 10, manualSpeed: 750 },
            }}
            features={{
              singleTap: { allow: false, intersect: "native" },
              range: false,
              touch: true,
            }}
            onStart={handleSelectionStart}
            onMove={handleSelectionMove}
            onStop={handleSelectionStop}
            onClick={handleBackgroundClick}
          >
            {viewMode === "list" && (
              <FileListView {...viewProps} onSelectAll={handleSelectAll} onRefresh={onRefresh} dateColumnLabel={t("trash.deletedAt")} />
            )}
            {viewMode === "grid" && (
              <FileGridView {...viewProps} showThumb={showThumb} onRefresh={onRefresh} />
            )}
            {viewMode === "gallery" && (
              <FileGalleryView {...viewProps} showThumb={showThumb} onRefresh={onRefresh} />
            )}
          </SelectionArea>
        </FileContextMenu>
      )}

      {/* Permanent delete confirmation */}
      {deleteTargets.length > 0 && (
        <Dialog open={deleteTargets.length > 0} onOpenChange={(open) => { if (!open) setDeleteTargets([]); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("trash.permanentDelete")}</DialogTitle>
              <DialogDescription>{t("trash.permanentDeleteConfirm")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTargets([])} disabled={dialogLoading}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={confirmPermanentDelete} disabled={dialogLoading}>
                {dialogLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("trash.permanentDelete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty trash confirmation */}
      <Dialog open={emptyTrashOpen} onOpenChange={setEmptyTrashOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("trash.emptyTrash")}</DialogTitle>
            <DialogDescription>{t("trash.emptyTrashConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmptyTrashOpen(false)} disabled={dialogLoading}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmEmptyTrash} disabled={dialogLoading}>
              {dialogLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("trash.emptyTrash")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
