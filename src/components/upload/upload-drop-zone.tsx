import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/stores/upload";

interface UploadDropZoneProps {
  parentId: string | undefined;
  children: React.ReactNode;
  className?: string;
}

export function UploadDropZone({ parentId, children, className }: UploadDropZoneProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);
  const addFiles = useUploadStore((s) => s.addFiles);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (!parentId) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addFiles(files, parentId);
  }, [parentId, addFiles]);

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {isDragOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="size-10" />
            <p className="text-lg font-medium">{t("upload.dropHere")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
