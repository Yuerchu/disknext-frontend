import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { List, LayoutGrid, GalleryHorizontal, Image, ImageOff } from "lucide-react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "grid" | "gallery";

interface FileToolbarProps {
  path: string;
  viewMode: ViewMode;
  showThumb: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onShowThumbChange: (show: boolean) => void;
}

const viewModes: { value: ViewMode; icon: typeof List; labelKey: string }[] = [
  { value: "list", icon: List, labelKey: "file.viewList" },
  { value: "grid", icon: LayoutGrid, labelKey: "file.viewGrid" },
  { value: "gallery", icon: GalleryHorizontal, labelKey: "file.viewGallery" },
];

export function FileToolbar({ path, viewMode, showThumb, onViewModeChange, onShowThumbChange }: FileToolbarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const segments = path ? path.split("/").filter(Boolean) : [];

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {segments.length > 0 ? (
              <BreadcrumbLink className="cursor-pointer" onClick={() => navigate("/home")}>
                {t("nav.myFiles")}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{t("nav.myFiles")}</BreadcrumbPage>
            )}
          </BreadcrumbItem>

          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            const segPath = segments.slice(0, i + 1).join("/");

            return (
              <span key={segPath} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{decodeURIComponent(seg)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink className="cursor-pointer" onClick={() => navigate(`/home/${segPath}`)}>
                      {decodeURIComponent(seg)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* View controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* View mode buttons */}
        <div className="flex items-center rounded-md border">
          {viewModes.map((mode) => (
            <Tooltip key={mode.value}>
              <TooltipTrigger
                render={<Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8 rounded-none first:rounded-l-md last:rounded-r-md",
                    viewMode === mode.value && "bg-accent",
                  )}
                  onClick={() => onViewModeChange(mode.value)}
                />}
              >
                <mode.icon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>{t(mode.labelKey)}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Thumbnail toggle */}
        <Tooltip>
          <TooltipTrigger
            render={<Toggle size="sm" pressed={showThumb} onPressedChange={onShowThumbChange} />}
          >
            {showThumb ? <Image className="size-4" /> : <ImageOff className="size-4" />}
          </TooltipTrigger>
          <TooltipContent>
            {showThumb ? t("file.hideThumb") : t("file.showThumb")}
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
