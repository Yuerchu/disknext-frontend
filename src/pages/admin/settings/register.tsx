import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSettings } from "@/api";
import { useSettings } from "@/hooks/use-settings";

export default function RegisterSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useSettings(
    adminSettings.register,
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
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.register.title")}</CardTitle>
          <CardDescription>{t("adminSettings.register.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.register.registerEnabled")}</Label>
            <Switch checked={data.is_register_enabled} onCheckedChange={(v) => update("is_register_enabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.register.requireActive")}</Label>
            <Switch checked={data.is_require_active} onCheckedChange={(v) => update("is_require_active", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.register.passwordRequired")}</Label>
            <Switch checked={data.is_auth_password_required} onCheckedChange={(v) => update("is_auth_password_required", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.register.defaultGroupId")}</Label>
              <Input value={data.default_group_id ?? ""} onChange={(e) => update("default_group_id", e.target.value || null)} placeholder="UUID" className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.register.defaultAdminId")}</Label>
              <Input value={data.default_admin_id ?? ""} onChange={(e) => update("default_admin_id", e.target.value || null)} placeholder="UUID" className="font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.register.authMethods")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.register.emailPassword")}</Label>
            <Switch checked={data.is_auth_email_password_enabled} onCheckedChange={(v) => update("is_auth_email_password_enabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.register.phoneSms")}</Label>
            <Switch checked={data.is_auth_phone_sms_enabled} onCheckedChange={(v) => update("is_auth_phone_sms_enabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.register.passkey")}</Label>
            <Switch checked={data.is_auth_passkey_enabled} onCheckedChange={(v) => update("is_auth_passkey_enabled", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.register.binding")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.register.emailBinding")}</Label>
            <Switch checked={data.is_auth_email_binding_required} onCheckedChange={(v) => update("is_auth_email_binding_required", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.register.phoneBinding")}</Label>
            <Switch checked={data.is_auth_phone_binding_required} onCheckedChange={(v) => update("is_auth_phone_binding_required", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.register.smsCodeTtl")}</Label>
              <Input type="number" value={data.sms_code_ttl_minutes} onChange={(e) => update("sms_code_ttl_minutes", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.register.smsCodeRateLimit")}</Label>
              <Input type="number" value={data.sms_code_rate_limit_seconds} onChange={(e) => update("sms_code_rate_limit_seconds", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
