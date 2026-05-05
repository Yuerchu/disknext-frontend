import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileIcon } from "./file-icon";
import type { FileActions } from "./file-context-menu";
import type { EntryResponse } from "@/api";
import { cn } from "@/lib/utils";
import {
  FolderOpen, Download, Pencil, Share2, Undo2, Trash2, FolderPlus, FilePlus, RefreshCw,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

interface FileListViewProps {
  items: EntryResponse[];
  selectedIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onSelectAll: (checked: boolean) => void;
  onNavigate: (entry: EntryResponse) => void;
  onRefresh: () => void;
  actions: FileActions;
  dateColumnLabel?: string;
}

export function FileListView({ items, selectedIds, onSelect, onSelectAll, onNavigate, actions, dateColumnLabel }: FileListViewProps) {
  const { t } = useTranslation();
  const lastClickedRef = useRef<number>(-1);
  const [contextEntry, setContextEntry] = useState<EntryResponse | null>(null);

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = items.some((i) => selectedIds.has(i.id)) && !allSelected;

  const handleRowClick = useCallback((entry: EntryResponse, index: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      onSelect(entry.id, e);
      lastClickedRef.current = index;
      return;
    }
    if (entry.type === "folder") {
      onNavigate(entry);
    }
  }, [onSelect, onNavigate]);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>{t("file.name")}</TableHead>
              <TableHead className="w-24 text-right">{t("file.size")}</TableHead>
              <TableHead className="w-40 text-right">{dateColumnLabel ?? t("file.modifiedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entry, index) => {
              const isFolder = entry.type === "folder";
              const selected = selectedIds.has(entry.id);

              return (
                <TableRow
                  key={entry.id}
                  data-selectable
                  data-entry-id={entry.id}
                  className={cn("cursor-default select-none", selected && "bg-primary/10")}
                  onClick={(e) => handleRowClick(entry, index, e)}
                  onDoubleClick={() => { if (isFolder) onNavigate(entry); }}
                  onContextMenu={() => setContextEntry(entry)}
                >
                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => onSelect(entry.id, { ctrlKey: true } as React.MouseEvent)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileIcon name={entry.name} isFolder={isFolder} className="size-5 shrink-0" />
                      <span className={cn("truncate", isFolder && "font-medium")}>{entry.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {isFolder ? "-" : formatBytes(entry.size)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(entry.updated_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        {contextEntry ? (
          actions.onRestore ? (
            /* Trash mode: restore + permanent delete */
            <>
              <ContextMenuItem onClick={() => actions.onRestore?.([contextEntry])}>
                <Undo2 className="mr-2 size-4" />{t("trash.restore")}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem className="text-destructive" onClick={() => actions.onPermanentDelete?.([contextEntry])}>
                <Trash2 className="mr-2 size-4" />{t("trash.permanentDelete")}
              </ContextMenuItem>
            </>
          ) : (
            /* File browser mode */
            <>
              {contextEntry.type === "folder" ? (
                <>
                  <ContextMenuItem onClick={() => actions.onNavigate(contextEntry)}>
                    <FolderOpen className="mr-2 size-4" />{t("contextMenu.open")}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => actions.onShare(contextEntry)}>
                    <Share2 className="mr-2 size-4" />{t("contextMenu.share")}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => actions.onRename(contextEntry)}>
                    <Pencil className="mr-2 size-4" />{t("common.rename")}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem className="text-destructive" onClick={() => actions.onDelete([contextEntry])}>
                    <Trash2 className="mr-2 size-4" />{t("common.delete")}
                  </ContextMenuItem>
                </>
              ) : (
                <>
                  <ContextMenuItem onClick={() => actions.onDownload(contextEntry)}>
                    <Download className="mr-2 size-4" />{t("common.download")}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => actions.onShare(contextEntry)}>
                    <Share2 className="mr-2 size-4" />{t("contextMenu.share")}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => actions.onRename(contextEntry)}>
                    <Pencil className="mr-2 size-4" />{t("common.rename")}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem className="text-destructive" onClick={() => actions.onDelete([contextEntry])}>
                    <Trash2 className="mr-2 size-4" />{t("common.delete")}
                  </ContextMenuItem>
                </>
              )}
            </>
          )
        ) : actions.onEmptyTrash ? (
          /* Trash mode background */
          <>
            <ContextMenuItem className="text-destructive" onClick={actions.onEmptyTrash}>
              <Trash2 className="mr-2 size-4" />{t("trash.emptyTrash")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={actions.onRefresh}>
              <RefreshCw className="mr-2 size-4" />{t("contextMenu.refresh")}
            </ContextMenuItem>
          </>
        ) : (
          /* File browser mode background */
          <>
            <ContextMenuItem onClick={actions.onCreateFolder}>
              <FolderPlus className="mr-2 size-4" />{t("contextMenu.createFolder")}
            </ContextMenuItem>
            <ContextMenuItem onClick={actions.onCreateFile}>
              <FilePlus className="mr-2 size-4" />{t("contextMenu.createFile")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={actions.onRefresh}>
              <RefreshCw className="mr-2 size-4" />{t("contextMenu.refresh")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
