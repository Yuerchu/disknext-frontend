import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSettings } from "@/api";
import { useAdminSettings } from "@/hooks/use-admin-settings";

export default function SiteSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useAdminSettings(
    "site",
    adminSettings.site,
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
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.site.basicInfo")}</CardTitle>
          <CardDescription>{t("adminSettings.site.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminSettings.site.siteUrl")}</Label>
            <Input value={data.site_url} onChange={(e) => update("site_url", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.siteName")}</Label>
              <Input value={data.site_name} onChange={(e) => update("site_name", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.siteTitle")}</Label>
              <Input value={data.site_title} onChange={(e) => update("site_title", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.site.siteKeywords")}</Label>
            <Input value={data.site_keywords} onChange={(e) => update("site_keywords", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.site.siteDescription")}</Label>
            <Textarea value={data.site_description} onChange={(e) => update("site_description", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 公告与法务 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.site.notices")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminSettings.site.noticePublic")}</Label>
            <Textarea value={data.site_notice_public ?? ""} onChange={(e) => update("site_notice_public", e.target.value || null)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.site.noticeUser")}</Label>
            <Textarea value={data.site_notice_user ?? ""} onChange={(e) => update("site_notice_user", e.target.value || null)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.tosUrl")}</Label>
              <Input value={data.tos_url ?? ""} onChange={(e) => update("tos_url", e.target.value || null)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.privacyUrl")}</Label>
              <Input value={data.privacy_url ?? ""} onChange={(e) => update("privacy_url", e.target.value || null)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.site.footerCode")}</Label>
            <Textarea value={data.footer_code ?? ""} onChange={(e) => update("footer_code", e.target.value || null)} className="font-mono text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Logo 与视图 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.site.display")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.logoLight")}</Label>
              <Input value={data.logo_light ?? ""} onChange={(e) => update("logo_light", e.target.value || null)} placeholder="URL" />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.logoDark")}</Label>
              <Input value={data.logo_dark ?? ""} onChange={(e) => update("logo_dark", e.target.value || null)} placeholder="URL" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.homeViewMethod")}</Label>
              <Select value={data.home_view_method} onValueChange={(v) => { if (v) update("home_view_method", v as "icon" | "list" | "smallIcon"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="icon">Icon</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="smallIcon">Small Icon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.shareViewMethod")}</Label>
              <Select value={data.share_view_method} onValueChange={(v) => { if (v) update("share_view_method", v as "icon" | "list" | "smallIcon"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="icon">Icon</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="smallIcon">Small Icon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.tempPath")}</Label>
              <Input value={data.temp_path} onChange={(e) => update("temp_path", e.target.value)} className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.site.avatarPath")}</Label>
              <Input value={data.avatar_path} onChange={(e) => update("avatar_path", e.target.value)} className="font-mono" />
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
