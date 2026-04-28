import { useTranslation } from "react-i18next";
import {
  FolderOpen, Download, Pencil,
  Trash2, FolderPlus, FilePlus, RefreshCw,
} from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { EntryResponse } from "@/api";

export type MenuTarget =
  | { type: "empty" }
  | { type: "file"; entry: EntryResponse }
  | { type: "folder"; entry: EntryResponse }
  | { type: "batch"; count: number };

export interface FileActions {
  onRefresh: () => void;
  onNavigate: (entry: EntryResponse) => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onRename: (entry: EntryResponse) => void;
  onDelete: (entries: EntryResponse[]) => void;
  onDownload: (entry: EntryResponse) => void;
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

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className}>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {target.type === "empty" && (
          <>
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
      </ContextMenuContent>
    </ContextMenu>
  );
}
