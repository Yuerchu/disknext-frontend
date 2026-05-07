import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSettings } from "@/api";
import type { SmtpEncryption } from "@/api";
import { useAdminSettings } from "@/hooks/use-admin-settings";

export default function MailSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useAdminSettings(
    "mail",
    adminSettings.mail,
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
      {/* SMTP 服务器 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.mail.smtpServer")}</CardTitle>
          <CardDescription>{t("adminSettings.mail.smtpServerDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.smtpHost")}</Label>
              <Input value={data.smtp_host} onChange={(e) => update("smtp_host", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.smtpPort")}</Label>
              <Input type="number" value={data.smtp_port} onChange={(e) => update("smtp_port", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.smtpUser")}</Label>
              <Input value={data.smtp_user} onChange={(e) => update("smtp_user", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.smtpPass")}</Label>
              <Input type="password" value={data.smtp_pass ?? ""} onChange={(e) => update("smtp_pass", e.target.value || null)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.smtpEncryption")}</Label>
              <Select value={data.smtp_encryption} onValueChange={(v) => { if (v) update("smtp_encryption", v as SmtpEncryption); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="starttls">STARTTLS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.smtpReplyTo")}</Label>
              <Input type="email" value={data.smtp_reply_to} onChange={(e) => update("smtp_reply_to", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 邮件选项 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.mail.mailOptions")}</CardTitle>
          <CardDescription>{t("adminSettings.mail.mailOptionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.mailFromName")}</Label>
              <Input value={data.mail_from_name} onChange={(e) => update("mail_from_name", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.mailFromAddress")}</Label>
              <Input type="email" value={data.mail_from_address} onChange={(e) => update("mail_from_address", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.mailKeepalive")}</Label>
              <Input type="number" value={data.mail_keepalive} onChange={(e) => update("mail_keepalive", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.mail.mailCodeTtlMinutes")}</Label>
              <Input type="number" value={data.mail_code_ttl_minutes} onChange={(e) => update("mail_code_ttl_minutes", Number(e.target.value))} />
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
