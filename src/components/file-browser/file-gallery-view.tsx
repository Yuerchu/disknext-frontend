import { Checkbox } from "@/components/ui/checkbox";
import { FileIcon } from "./file-icon";
import { FileContextMenu, type FileActions } from "./file-context-menu";
import type { EntryResponse } from "@/api";
import { cn } from "@/lib/utils";
import { file } from "@/api";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface FileGalleryViewProps {
  items: EntryResponse[];
  selectedIds: Set<string>;
  showThumb: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onNavigate: (entry: EntryResponse) => void;
  onRefresh: () => void;
  actions: FileActions;
}

export function FileGalleryView({ items, selectedIds, showThumb, onSelect, onNavigate, actions }: FileGalleryViewProps) {
  return (
    <div className="grid gap-2 p-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
      {items.map((entry) => {
        const isFolder = entry.type === "folder";
        const selected = selectedIds.has(entry.id);
        const showImage = showThumb && entry.thumb && !isFolder;

        return (
          <FileContextMenu key={entry.id} target={{ type: isFolder ? "folder" : "file", entry }} actions={actions}>
            <div
              data-selectable
              data-entry-id={entry.id}
              className={cn(
                "group relative rounded-lg overflow-hidden cursor-default select-none transition-all",
                selected ? "ring-2 ring-primary/50" : "hover:ring-1 hover:ring-border",
              )}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey) onSelect(entry.id, e);
                else if (isFolder) onNavigate(entry);
              }}
              onDoubleClick={() => { if (isFolder) onNavigate(entry); }}
            >
              <div
                className={cn("absolute top-2 left-2 z-10", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox checked={selected} onCheckedChange={() => onSelect(entry.id, { ctrlKey: true } as React.MouseEvent)} />
              </div>

              <div className="flex aspect-square items-center justify-center bg-muted">
                {showImage ? (
                  <img src={file.getThumbUrl(entry.id)} alt={entry.name} loading="lazy" className="size-full object-cover" />
                ) : (
                  <FileIcon name={entry.name} isFolder={isFolder} className="size-16" />
                )}
              </div>

              <div className="p-2 bg-card">
                <p className="truncate text-xs">{entry.name}</p>
                {!isFolder && <p className="mt-0.5 text-[10px] text-muted-foreground">{formatBytes(entry.size)}</p>}
              </div>
            </div>
          </FileContextMenu>
        );
      })}
    </div>
  );
}
