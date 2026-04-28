import { useTranslation } from "react-i18next";
import { FolderOpen, FolderPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty, EmptyContent, EmptyDescription, EmptyHeader,
  EmptyMedia, EmptyTitle,
} from "@/components/ui/empty";
import type { FileActions } from "./file-context-menu";

interface FileEmptyStateProps {
  actions: FileActions;
}

export function FileEmptyState({ actions }: FileEmptyStateProps) {
  const { t } = useTranslation();

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
        <Button onClick={actions.onCreateFolder}>
          <Upload className="mr-2 size-4" />
          {t("common.upload")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
