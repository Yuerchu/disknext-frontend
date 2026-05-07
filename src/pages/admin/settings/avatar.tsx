import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSettings } from "@/api";
import { useAdminSettings } from "@/hooks/use-admin-settings";

export default function AvatarSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useAdminSettings(
    "avatar",
    adminSettings.avatar,
    t("adminSettings.saveSuccess"),
  );

  if (loading || !data) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const handleSave = () => save(data);

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      {/* 头像设置 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.avatar.title")}</CardTitle>
          <CardDescription>{t("adminSettings.avatar.titleDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminSettings.avatar.gravatarServer")}</Label>
            <Input value={data.gravatar_server} onChange={(e) => update("gravatar_server", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.avatar.avatarSize")}</Label>
              <Input type="number" value={data.avatar_size} onChange={(e) => update("avatar_size", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.avatar.avatarQuality")}</Label>
              <Input type="number" min={1} max={100} value={data.avatar_quality} onChange={(e) => update("avatar_quality", Number(e.target.value))} />
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
