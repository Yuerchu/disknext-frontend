import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  FolderOpen, Download, Pencil, Share2, Undo2,
  Trash2, FolderPlus, FilePlus, RefreshCw, Upload,
} from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { EntryResponse } from "@/api";
import { useUploadStore } from "@/stores/upload";

export type MenuTarget =
  | { type: "empty" }
  | { type: "file"; entry: EntryResponse }
  | { type: "folder"; entry: EntryResponse }
  | { type: "batch"; count: number }
  | { type: "trash-file"; entry: EntryResponse }
  | { type: "trash-folder"; entry: EntryResponse }
  | { type: "trash-batch"; count: number }
  | { type: "trash-empty" };

export interface FileActions {
  onRefresh: () => void;
  onNavigate: (entry: EntryResponse) => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onRename: (entry: EntryResponse) => void;
  onDelete: (entries: EntryResponse[]) => void;
  onDownload: (entry: EntryResponse) => void;
  onShare: (entry: EntryResponse) => void;
  onRestore?: (entries: EntryResponse[]) => void;
  onPermanentDelete?: (entries: EntryResponse[]) => void;
  onEmptyTrash?: () => void;
  directoryId?: string;
}

interface FileContextMenuProps {
  children: React.ReactNode;
  target: MenuTarget;
  actions: FileActions;
  selectedEntries?: EntryResponse[];
  className?: string;
}

export function FileContextMenu({ children, target, actions, selectedEntries, className }: FileContextMenuProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFiles = useUploadStore((s) => s.addFiles);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !actions.directoryId) return;
    addFiles(Array.from(files), actions.directoryId);
    e.target.value = "";
  }, [actions.directoryId, addFiles]);

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className}>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {target.type === "empty" && (
          <>
            {actions.directoryId && (
              <ContextMenuItem onClick={handleUploadClick}>
                <Upload className="mr-2 size-4" />
                {t("contextMenu.uploadFile")}
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={actions.onCreateFolder}>
              <FolderPlus className="mr-2 size-4" />
              {t("contextMenu.createFolder")}
            </ContextMenuItem>
            <ContextMenuItem onClick={actions.onCreateFile}>
              <FilePlus className="mr-2 size-4" />
              {t("contextMenu.createFile")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={actions.onRefresh}>
              <RefreshCw className="mr-2 size-4" />
              {t("contextMenu.refresh")}
            </ContextMenuItem>
          </>
        )}

        {target.type === "folder" && (
          <>
            <ContextMenuItem onClick={() => actions.onNavigate(target.entry)}>
              <FolderOpen className="mr-2 size-4" />
              {t("contextMenu.open")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.onShare(target.entry)}>
              <Share2 className="mr-2 size-4" />
              {t("contextMenu.share")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => actions.onRename(target.entry)}>
              <Pencil className="mr-2 size-4" />
              {t("common.rename")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive" onClick={() => actions.onDelete([target.entry])}>
              <Trash2 className="mr-2 size-4" />
              {t("common.delete")}
            </ContextMenuItem>
          </>
        )}

        {target.type === "file" && (
          <>
            <ContextMenuItem onClick={() => actions.onDownload(target.entry)}>
              <Download className="mr-2 size-4" />
              {t("common.download")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.onShare(target.entry)}>
              <Share2 className="mr-2 size-4" />
              {t("contextMenu.share")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => actions.onRename(target.entry)}>
              <Pencil className="mr-2 size-4" />
              {t("common.rename")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive" onClick={() => actions.onDelete([target.entry])}>
              <Trash2 className="mr-2 size-4" />
              {t("common.delete")}
            </ContextMenuItem>
          </>
        )}

        {target.type === "batch" && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive"
              onClick={() => { if (selectedEntries) actions.onDelete(selectedEntries); }}
            >
              <Trash2 className="mr-2 size-4" />
              {t("common.delete")} ({target.count})
            </ContextMenuItem>
          </>
        )}

        {(target.type === "trash-file" || target.type === "trash-folder") && (
          <>
            <ContextMenuItem onClick={() => actions.onRestore?.([target.entry])}>
              <Undo2 className="mr-2 size-4" />
              {t("trash.restore")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive" onClick={() => actions.onPermanentDelete?.([target.entry])}>
              <Trash2 className="mr-2 size-4" />
              {t("trash.permanentDelete")}
            </ContextMenuItem>
          </>
        )}

        {target.type === "trash-batch" && (
          <>
            <ContextMenuItem onClick={() => { if (selectedEntries) actions.onRestore?.(selectedEntries); }}>
              <Undo2 className="mr-2 size-4" />
              {t("trash.restore")} ({target.count})
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive"
              onClick={() => { if (selectedEntries) actions.onPermanentDelete?.(selectedEntries); }}
            >
              <Trash2 className="mr-2 size-4" />
              {t("trash.permanentDelete")} ({target.count})
            </ContextMenuItem>
          </>
        )}

        {target.type === "trash-empty" && (
          <>
            {actions.onEmptyTrash && (
              <ContextMenuItem className="text-destructive" onClick={actions.onEmptyTrash}>
                <Trash2 className="mr-2 size-4" />
                {t("trash.emptyTrash")}
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={actions.onRefresh}>
              <RefreshCw className="mr-2 size-4" />
              {t("contextMenu.refresh")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
    </ContextMenu>
  );
}
