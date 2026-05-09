import { useTranslation } from "react-i18next";
import { X, RotateCcw, CheckCircle2, AlertCircle, Loader2, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UploadTask } from "@/stores/upload";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "";
  return `${formatSize(bytesPerSec)}/s`;
}

interface UploadTaskItemProps {
  task: UploadTask;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function UploadTaskItem({ task, onCancel, onRetry, onRemove }: UploadTaskItemProps) {
  const { t } = useTranslation();

  const statusIcon = {
    pending: <Clock className="size-4 text-muted-foreground" />,
    uploading: <Loader2 className="size-4 animate-spin text-primary" />,
    complete: <CheckCircle2 className="size-4 text-green-500" />,
    error: <AlertCircle className="size-4 text-destructive" />,
    cancelled: <Ban className="size-4 text-muted-foreground" />,
  }[task.status];

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="flex-1 truncate text-sm" title={task.fileName}>{task.fileName}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatSize(task.fileSize)}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          {(task.status === "error" || task.status === "cancelled") && (
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={() => onRetry(task.id)} />}>
                <RotateCcw className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{t("upload.retry")}</TooltipContent>
            </Tooltip>
          )}
          {(task.status === "pending" || task.status === "uploading") && (
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={() => onCancel(task.id)} />}>
                <X className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{t("common.cancel")}</TooltipContent>
            </Tooltip>
          )}
          {(task.status === "complete" || task.status === "error" || task.status === "cancelled") && (
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={() => onRemove(task.id)} />}>
                <X className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{t("upload.removeTask")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {(task.status === "uploading" || task.status === "pending") && (
        <div className="flex items-center gap-2">
          <Progress value={task.progress} className="flex-1 gap-0">
            <ProgressTrack className="h-1">
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground w-10 text-right">{task.progress}%</span>
          {task.speed > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground w-16 text-right">{formatSpeed(task.speed)}</span>
          )}
        </div>
      )}

      {task.status === "error" && task.error && (
        <p className="text-xs text-destructive truncate" title={task.error}>{task.error}</p>
      )}
    </div>
  );
}
