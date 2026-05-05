import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Save, Upload, Globe, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { userSettings, resolveErrorMessage } from "@/api";
import { useSettings } from "@/hooks/use-settings";
import { useUserStore } from "@/stores/user";
import { setLocale } from "@/i18n";

const API_BASE = import.meta.env.VITE_API_URL || "";

const TIMEZONE_OPTIONS = Array.from({ length: 27 }, (_, i) => {
  const offset = i - 12;
  const label = offset === 0 ? "UTC" : `UTC${offset > 0 ? "+" : ""}${offset}`;
  return { value: offset, label };
});

export default function ProfileSection() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useSettings(
    userSettings,
    t("userSettings.saveSuccess"),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarBust, setAvatarBust] = useState(Date.now());

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const avatarUrl = `${API_BASE}/api/v1/user/avatar/${data.id}/128?t=${avatarBust}`;

  const refreshAfterAvatarChange = () => {
    setAvatarBust(Date.now());
    useUserStore.getState().fetchProfile();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      await userSettings.uploadAvatar(file);
      toast.success(t("userSettings.profile.avatarUpdated"));
      refreshAfterAvatarChange();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGravatar = async () => {
    setAvatarUploading(true);
    try {
      await userSettings.switchToGravatar();
      toast.success(t("userSettings.profile.avatarUpdated"));
      refreshAfterAvatarChange();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleResetAvatar = async () => {
    setAvatarUploading(true);
    try {
      await userSettings.resetAvatar();
      toast.success(t("userSettings.profile.avatarUpdated"));
      refreshAfterAvatarChange();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    await save({
      nickname: data.nickname || undefined,
      language: data.language,
      timezone: data.timezone,
    });
    if (data.language) {
      setLocale(data.language);
    }
    useUserStore.getState().fetchProfile();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>{t("userSettings.profile.avatarTitle")}</CardTitle>
          <CardDescription>{t("userSettings.profile.avatarDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <img
            src={avatarUrl}
            alt="avatar"
            className="size-20 rounded-full object-cover bg-muted"
          />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                {t("userSettings.profile.uploadAvatar")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGravatar}
                disabled={avatarUploading}
              >
                <Globe className="mr-2 size-4" />
                {t("userSettings.profile.useGravatar")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAvatar}
                disabled={avatarUploading}
              >
                <RotateCcw className="mr-2 size-4" />
                {t("userSettings.profile.resetAvatar")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("userSettings.profile.infoTitle")}</CardTitle>
          <CardDescription>{t("userSettings.profile.infoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("userSettings.profile.nickname")}</Label>
              <Input
                value={data.nickname}
                onChange={(e) => update("nickname", e.target.value)}
                placeholder={t("userSettings.profile.nicknamePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("userSettings.profile.email")}</Label>
              <Input value={data.email} disabled />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>{t("userSettings.profile.group")}</Label>
              <div className="flex items-center h-9">
                <Badge variant="secondary">{data.group_name}</Badge>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("userSettings.profile.groupExpires")}</Label>
              <div className="flex items-center h-9 text-sm text-muted-foreground">
                {data.group_expires ? formatDate(data.group_expires) : t("userSettings.profile.groupNever")}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("userSettings.profile.createdAt")}</Label>
              <div className="flex items-center h-9 text-sm text-muted-foreground">
                {formatDate(data.created_at)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>{t("userSettings.profile.prefsTitle")}</CardTitle>
          <CardDescription>{t("userSettings.profile.prefsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("userSettings.profile.language")}</Label>
              <Select value={data.language} onValueChange={(v) => { if (v) update("language", v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh-TW">繁體中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("userSettings.profile.timezone")}</Label>
              <Select
                value={String(data.timezone)}
                onValueChange={(v) => { if (v) update("timezone", parseInt(v)); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={String(tz.value)}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
