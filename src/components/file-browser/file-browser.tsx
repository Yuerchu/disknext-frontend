import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { SelectionArea, type SelectionEvent } from "@viselect/react";
import { FileListView } from "./file-list-view";
import { FileGridView } from "./file-grid-view";
import { FileGalleryView } from "./file-gallery-view";
import { FileEmptyState } from "./file-empty-state";
import { FileContextMenu, type FileActions } from "./file-context-menu";
import { CreateFolderDialog, CreateFileDialog, RenameDialog, DeleteDialog } from "./file-dialogs";
import { Skeleton } from "@/components/ui/skeleton";
import { file, resolveErrorMessage } from "@/api";
import type { DirectoryResponse, EntryResponse } from "@/api";
import type { ViewMode } from "./file-toolbar";

interface FileBrowserProps {
  directory: DirectoryResponse | null;
  viewMode: ViewMode;
  showThumb: boolean;
  loading: boolean;
  path: string;
  onRefresh: () => void;
}

export function FileBrowser({ directory, viewMode, showThumb, loading, path, onRefresh }: FileBrowserProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number>(-1);
  const preDragSelectionRef = useRef<Set<string>>(new Set());

  // Dialog state
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<EntryResponse | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<EntryResponse[]>([]);

  const sortedItems = useMemo(() => {
    if (!directory) return [];
    return [...directory.objects].sort((a, b) => {
      if (a.type !== b.type) {
        if (a.type === "folder") return -1;
        if (b.type === "folder") return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [directory]);

  const handleNavigate = useCallback((entry: EntryResponse) => {
    if (entry.type === "folder") {
      const newPath = path ? `${path}/${entry.name}` : entry.name;
      navigate(`/home/${newPath}`);
      setSelectedIds(new Set());
    }
  }, [navigate, path]);

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

  const handleDownload = useCallback(async (entry: EntryResponse) => {
    try {
      const { access_token } = await file.createDownloadToken(entry.id);
      const url = `${import.meta.env.VITE_API_URL || ""}/api/v1/file/download/${access_token}`;
      window.open(url, "_blank");
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    }
  }, []);

  // --- 框选事件 ---

  const handleSelectionStart = useCallback(({ event, selection }: SelectionEvent) => {
    if (!event) return;

    // 右键不触发框选
    if ("button" in event && (event as MouseEvent).button === 2) {
      selection.cancel();
      return;
    }

    // Checkbox 上不触发框选
    const target = event.target as HTMLElement;
    if (target.closest("[data-slot='checkbox']")) {
      selection.cancel();
      return;
    }

    // Ctrl+拖 → 保留已选；普通拖 → 重新选
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

  const handleSelectionStop = useCallback((_e: SelectionEvent) => {
    // onMove 已经增量更新了 selectedIds，onStop 只需清理 viselect 内部状态
    // 不在这里调用 clearSelection，让 viselect 自行管理矩形隐藏
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (!target.closest("[data-selectable]")) {
      setSelectedIds(new Set());
    }
  }, []);

  const handleDialogSuccess = useCallback(() => {
    onRefresh();
    setSelectedIds(new Set());
  }, [onRefresh]);

  // 选中的 entries
  const selectedEntries = useMemo(
    () => sortedItems.filter((i) => selectedIds.has(i.id)),
    [sortedItems, selectedIds],
  );

  // Shared actions object
  const actions: FileActions = useMemo(() => ({
    onRefresh,
    onNavigate: handleNavigate,
    onCreateFolder: () => setCreateFolderOpen(true),
    onCreateFile: () => setCreateFileOpen(true),
    onRename: (entry) => setRenameTarget(entry),
    onDelete: (entries) => setDeleteTargets(entries),
    onDownload: handleDownload,
  }), [onRefresh, handleNavigate, handleDownload]);

  // View props
  const viewProps = {
    items: sortedItems,
    selectedIds,
    onSelect: handleSelect,
    onNavigate: handleNavigate,
    actions,
  };

  // Context menu target for background area
  const bgTarget = selectedIds.size > 1
    ? { type: "batch" as const, count: selectedIds.size }
    : { type: "empty" as const };

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
        <FileContextMenu target={{ type: "empty" }} actions={actions} className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col">
            <FileEmptyState actions={actions} />
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
              <FileListView {...viewProps} onSelectAll={handleSelectAll} onRefresh={onRefresh} />
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

      {/* Dialogs */}
      {directory && (
        <>
          <CreateFolderDialog
            open={createFolderOpen}
            onOpenChange={setCreateFolderOpen}
            parentId={directory.id}
            onSuccess={handleDialogSuccess}
          />
          <CreateFileDialog
            open={createFileOpen}
            onOpenChange={setCreateFileOpen}
            parentId={directory.id}
            onSuccess={handleDialogSuccess}
          />
        </>
      )}
      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => { if (!open) setRenameTarget(null); }}
          entryId={renameTarget.id}
          currentName={renameTarget.name}
          onSuccess={handleDialogSuccess}
        />
      )}
      {deleteTargets.length > 0 && (
        <DeleteDialog
          open={deleteTargets.length > 0}
          onOpenChange={(open) => { if (!open) setDeleteTargets([]); }}
          ids={deleteTargets.map((e) => e.id)}
          names={deleteTargets.map((e) => e.name)}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
}
