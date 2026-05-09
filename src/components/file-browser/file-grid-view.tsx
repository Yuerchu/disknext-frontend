import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileIcon } from "./file-icon";
import { ThumbImage } from "./thumb-image";
import { FileContextMenu, type FileActions } from "./file-context-menu";
import type { EntryResponse } from "@/api";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface FileGridViewProps {
  items: EntryResponse[];
  selectedIds: Set<string>;
  showThumb: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onNavigate: (entry: EntryResponse) => void;
  onRefresh: () => void;
  actions: FileActions;
}

export function FileGridView({ items, selectedIds, showThumb, onSelect, onNavigate, actions }: FileGridViewProps) {
  return (
    <div className="grid gap-1 p-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
      {items.map((entry) => {
        const isFolder = entry.type === "folder";
        const selected = selectedIds.has(entry.id);
        const isThumbable = !!entry.mime_type && /^(image|video|audio)\//.test(entry.mime_type);
        const showImage = showThumb && !isFolder && (entry.thumb || isThumbable);

        return (
          <FileContextMenu key={entry.id} target={{ type: isFolder ? "folder" : "file", entry }} actions={actions}>
            <div
              data-selectable
              data-entry-id={entry.id}
              className={cn(
                "group relative flex flex-col items-center gap-1 p-3 rounded-lg cursor-default select-none transition-colors",
                selected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent",
              )}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey) onSelect(entry.id, e);
                else if (isFolder) onNavigate(entry);
              }}
              onDoubleClick={() => { if (isFolder) onNavigate(entry); }}
            >
              <div
                className={cn("absolute top-1.5 left-1.5 z-10", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox checked={selected} onCheckedChange={() => onSelect(entry.id, { ctrlKey: true } as React.MouseEvent)} />
              </div>

              {showImage ? (
                <ThumbImage fileId={entry.id} alt={entry.name} className="size-12 rounded" />
              ) : (
                <FileIcon name={entry.name} isFolder={isFolder} className="size-12" />
              )}

              <Tooltip>
                <TooltipTrigger render={<span className="w-full truncate px-1 text-center text-xs" />}>
                  {entry.name}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{entry.name}</p>
                  {!isFolder && <p className="text-muted-foreground">{formatBytes(entry.size)}</p>}
                </TooltipContent>
              </Tooltip>

              {!isFolder && <span className="text-[10px] text-muted-foreground">{formatBytes(entry.size)}</span>}
            </div>
          </FileContextMenu>
        );
      })}
    </div>
  );
}
