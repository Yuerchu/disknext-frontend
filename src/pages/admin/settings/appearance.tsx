import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSettings } from "@/api";
import { useAdminSettings } from "@/hooks/use-admin-settings";

export default function AppearanceSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useAdminSettings(
    "appearance",
    adminSettings.appearance,
    t("adminSettings.saveSuccess"),
  );

  if (loading || !data) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const handleSave = () => save(data);

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      {/* 缩略图 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.appearance.thumbnails")}</CardTitle>
          <CardDescription>{t("adminSettings.appearance.thumbnailsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.appearance.thumbWidth")}</Label>
              <Input type="number" value={data.thumb_width} onChange={(e) => update("thumb_width", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.appearance.thumbHeight")}</Label>
              <Input type="number" value={data.thumb_height} onChange={(e) => update("thumb_height", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 文件分类 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.appearance.fileCategories")}</CardTitle>
          <CardDescription>{t("adminSettings.appearance.fileCategoriesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminSettings.appearance.fileCategoryImage")}</Label>
            <Textarea value={data.file_category_image} onChange={(e) => update("file_category_image", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.appearance.fileCategoryVideo")}</Label>
            <Textarea value={data.file_category_video} onChange={(e) => update("file_category_video", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.appearance.fileCategoryAudio")}</Label>
            <Textarea value={data.file_category_audio} onChange={(e) => update("file_category_audio", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.appearance.fileCategoryDocument")}</Label>
            <Textarea value={data.file_category_document} onChange={(e) => update("file_category_document", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 其他 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.appearance.other")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.appearance.hotShareNum")}</Label>
              <Input type="number" value={data.hot_share_num} onChange={(e) => update("hot_share_num", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.appearance.maxEditSize")}</Label>
              <Input type="number" value={data.max_edit_size} onChange={(e) => update("max_edit_size", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
