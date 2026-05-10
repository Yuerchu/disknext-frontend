import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, FolderPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty, EmptyContent, EmptyDescription, EmptyHeader,
  EmptyMedia, EmptyTitle,
} from "@/components/ui/empty";
import { useUploadStore } from "@/stores/upload";
import type { FileActions } from "./file-context-menu";

interface FileEmptyStateProps {
  actions: FileActions;
}

export function FileEmptyState({ actions }: FileEmptyStateProps) {
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
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle>{t("file.emptyFolder")}</EmptyTitle>
        <EmptyDescription>{t("file.emptyFolderHint")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button variant="outline" onClick={actions.onCreateFolder}>
          <FolderPlus className="mr-2 size-4" />
          {t("contextMenu.createFolder")}
        </Button>
        <Button onClick={handleUploadClick} disabled={!actions.directoryId}>
          <Upload className="mr-2 size-4" />
          {t("common.upload")}
        </Button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      </EmptyContent>
    </Empty>
  );
}
