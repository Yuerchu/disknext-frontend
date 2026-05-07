import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSettings } from "@/api";
import type { PwaDisplayMode } from "@/api";
import { useAdminSettings } from "@/hooks/use-admin-settings";

export default function PwaSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useAdminSettings(
    "pwa",
    adminSettings.pwa,
    t("adminSettings.saveSuccess"),
  );

  if (loading || !data) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const handleSave = () => save(data);

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      {/* 图标 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.pwa.icons")}</CardTitle>
          <CardDescription>{t("adminSettings.pwa.iconsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminSettings.pwa.pwaSmallIcon")}</Label>
            <Input value={data.pwa_small_icon} onChange={(e) => update("pwa_small_icon", e.target.value)} placeholder="URL" />
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.pwa.pwaMediumIcon")}</Label>
            <Input value={data.pwa_medium_icon} onChange={(e) => update("pwa_medium_icon", e.target.value)} placeholder="URL" />
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.pwa.pwaLargeIcon")}</Label>
            <Input value={data.pwa_large_icon} onChange={(e) => update("pwa_large_icon", e.target.value)} placeholder="URL" />
          </div>
        </CardContent>
      </Card>

      {/* 显示 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.pwa.display")}</CardTitle>
          <CardDescription>{t("adminSettings.pwa.displayDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminSettings.pwa.pwaDisplay")}</Label>
            <Select value={data.pwa_display} onValueChange={(v) => { if (v) update("pwa_display", v as PwaDisplayMode); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standalone">Standalone</SelectItem>
                <SelectItem value="fullscreen">Fullscreen</SelectItem>
                <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                <SelectItem value="browser">Browser</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.pwa.pwaThemeColor")}</Label>
              <Input value={data.pwa_theme_color} onChange={(e) => update("pwa_theme_color", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.pwa.pwaBackgroundColor")}</Label>
              <Input value={data.pwa_background_color} onChange={(e) => update("pwa_background_color", e.target.value)} />
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
