import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSettings } from "@/api";
import type { CaptchaType } from "@/api";
import { useSettings } from "@/hooks/use-settings";

export default function CaptchaSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useSettings(
    adminSettings.captcha,
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
          <CardTitle>{t("adminSettings.captcha.scenes")}</CardTitle>
          <CardDescription>{t("adminSettings.captcha.scenesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.captcha.loginCaptcha")}</Label>
            <Switch checked={data.is_login_captcha} onCheckedChange={(v) => update("is_login_captcha", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.captcha.regCaptcha")}</Label>
            <Switch checked={data.is_reg_captcha} onCheckedChange={(v) => update("is_reg_captcha", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.captcha.regEmailCaptcha")}</Label>
            <Switch checked={data.is_reg_email_captcha} onCheckedChange={(v) => update("is_reg_email_captcha", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.captcha.forgetCaptcha")}</Label>
            <Switch checked={data.is_forget_captcha} onCheckedChange={(v) => update("is_forget_captcha", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.captcha.authnEnabled")}</Label>
            <Switch checked={data.is_authn_enabled} onCheckedChange={(v) => update("is_authn_enabled", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.captcha.provider")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminSettings.captcha.type")}</Label>
            <Select value={data.captcha_type} onValueChange={(v) => { if (v) update("captcha_type", v as CaptchaType); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("adminSettings.captcha.typeDefault")}</SelectItem>
                <SelectItem value="gcaptcha">Google reCAPTCHA</SelectItem>
                <SelectItem value="cloudflare turnstile">Cloudflare Turnstile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.captcha_type === "gcaptcha" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>reCAPTCHA Site Key</Label>
                <Input value={data.captcha_recaptcha_key ?? ""} onChange={(e) => update("captcha_recaptcha_key", e.target.value || null)} className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label>reCAPTCHA Secret Key</Label>
                <Input value={data.captcha_recaptcha_secret ?? ""} onChange={(e) => update("captcha_recaptcha_secret", e.target.value || null)} type="password" className="font-mono" />
              </div>
            </div>
          )}

          {data.captcha_type === "cloudflare turnstile" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Turnstile Site Key</Label>
                <Input value={data.captcha_cloudflare_key ?? ""} onChange={(e) => update("captcha_cloudflare_key", e.target.value || null)} className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label>Turnstile Secret Key</Label>
                <Input value={data.captcha_cloudflare_secret ?? ""} onChange={(e) => update("captcha_cloudflare_secret", e.target.value || null)} type="password" className="font-mono" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data.captcha_type === "default" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("adminSettings.captcha.imageConfig")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>{t("adminSettings.captcha.width")}</Label>
                <Input type="number" value={data.captcha_width} onChange={(e) => update("captcha_width", Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminSettings.captcha.height")}</Label>
                <Input type="number" value={data.captcha_height} onChange={(e) => update("captcha_height", Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminSettings.captcha.len")}</Label>
                <Input type="number" value={data.captcha_len} onChange={(e) => update("captcha_len", Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>{t("adminSettings.captcha.hollowLine")}</Label>
                <Switch checked={data.is_captcha_show_hollow_line} onCheckedChange={(v) => update("is_captcha_show_hollow_line", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("adminSettings.captcha.noiseDot")}</Label>
                <Switch checked={data.is_captcha_show_noise_dot} onCheckedChange={(v) => update("is_captcha_show_noise_dot", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("adminSettings.captcha.noiseText")}</Label>
                <Switch checked={data.is_captcha_show_noise_text} onCheckedChange={(v) => update("is_captcha_show_noise_text", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("adminSettings.captcha.slimeLine")}</Label>
                <Switch checked={data.is_captcha_show_slime_line} onCheckedChange={(v) => update("is_captcha_show_slime_line", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("adminSettings.captcha.sineLine")}</Label>
                <Switch checked={data.is_captcha_show_sine_line} onCheckedChange={(v) => update("is_captcha_show_sine_line", v)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
