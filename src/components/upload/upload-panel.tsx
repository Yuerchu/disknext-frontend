import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Minus, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUploadStore } from "@/stores/upload";
import { UploadTaskItem } from "./upload-task-item";

export function UploadPanel() {
  const { t } = useTranslation();
  const tasks = useUploadStore((s) => s.tasks);
  const panelOpen = useUploadStore((s) => s.panelOpen);
  const panelMinimized = useUploadStore((s) => s.panelMinimized);
  const setPanelOpen = useUploadStore((s) => s.setPanelOpen);
  const setPanelMinimized = useUploadStore((s) => s.setPanelMinimized);
  const cancelTask = useUploadStore((s) => s.cancelTask);
  const retryTask = useUploadStore((s) => s.retryTask);
  const removeTask = useUploadStore((s) => s.removeTask);
  const clearCompleted = useUploadStore((s) => s.clearCompleted);

  const summary = useMemo(() => {
    const total = tasks.length;
    const uploading = tasks.filter((t) => t.status === "uploading").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const complete = tasks.filter((t) => t.status === "complete").length;
    const error = tasks.filter((t) => t.status === "error").length;
    const active = uploading + pending;

    const totalProgress = total > 0
      ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total)
      : 0;

    return { total, uploading, pending, complete, error, active, totalProgress };
  }, [tasks]);

  if (!panelOpen || tasks.length === 0) return null;

  const hasFinished = tasks.some(
    (t) => t.status === "complete" || t.status === "cancelled",
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border bg-popover shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <h3 className="flex-1 text-sm font-medium">
          {summary.active > 0
            ? t("upload.uploading", { count: summary.active })
            : t("upload.title")}
        </h3>
        <div className="flex items-center gap-0.5">
          {hasFinished && (
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon-sm" onClick={clearCompleted} />
              }>
                <Trash2 className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{t("upload.clearCompleted")}</TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPanelMinimized(!panelMinimized)}
          >
            {panelMinimized ? <ChevronUp className="size-3.5" /> : <Minus className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPanelOpen(false)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Total progress bar */}
      {summary.active > 0 && !panelMinimized && (
        <div className="px-3 pt-2">
          <Progress value={summary.totalProgress} className="gap-0">
            <ProgressTrack className="h-1.5">
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>{t("upload.progress", { done: summary.complete, total: summary.total })}</span>
            {summary.error > 0 && (
              <span className="text-destructive">
                {t("upload.errorCount", { count: summary.error })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Task list */}
      {!panelMinimized && (
        <ScrollArea className="max-h-72">
          <div className="divide-y">
            {tasks.map((task) => (
              <UploadTaskItem
                key={task.id}
                task={task}
                onCancel={cancelTask}
                onRetry={retryTask}
                onRemove={removeTask}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
