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

export default function AdvancedSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useSettings(
    adminSettings.advanced,
    t("adminSettings.saveSuccess"),
  );

  if (loading || !data) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const handleSave = () => save(data);

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      {/* 超时设置 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.advanced.timeout")}</CardTitle>
          <CardDescription>{t("adminSettings.advanced.timeoutDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutArchive")}</Label>
              <Input type="number" value={data.timeout_archive} onChange={(e) => update("timeout_archive", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutDownload")}</Label>
              <Input type="number" value={data.timeout_download} onChange={(e) => update("timeout_download", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutPreview")}</Label>
              <Input type="number" value={data.timeout_preview} onChange={(e) => update("timeout_preview", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutDocPreview")}</Label>
              <Input type="number" value={data.timeout_doc_preview} onChange={(e) => update("timeout_doc_preview", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 上传超时 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.advanced.upload")}</CardTitle>
          <CardDescription>{t("adminSettings.advanced.uploadDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutUploadCredential")}</Label>
              <Input type="number" value={data.timeout_upload_credential} onChange={(e) => update("timeout_upload_credential", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutUploadSession")}</Label>
              <Input type="number" value={data.timeout_upload_session} onChange={(e) => update("timeout_upload_session", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 服务超时 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.advanced.serviceTimeout")}</CardTitle>
          <CardDescription>{t("adminSettings.advanced.serviceTimeoutDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutSlaveApi")}</Label>
              <Input type="number" value={data.timeout_slave_api} onChange={(e) => update("timeout_slave_api", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutOnedriveMonitor")}</Label>
              <Input type="number" value={data.timeout_onedrive_monitor} onChange={(e) => update("timeout_onedrive_monitor", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutShareDownloadSession")}</Label>
              <Input type="number" value={data.timeout_share_download_session} onChange={(e) => update("timeout_share_download_session", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutOnedriveCallbackCheck")}</Label>
              <Input type="number" value={data.timeout_onedrive_callback_check} onChange={(e) => update("timeout_onedrive_callback_check", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutAria2Call")}</Label>
              <Input type="number" value={data.timeout_aria2_call} onChange={(e) => update("timeout_aria2_call", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.advanced.timeoutOnedriveSource")}</Label>
              <Input type="number" value={data.timeout_onedrive_source} onChange={(e) => update("timeout_onedrive_source", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 其他 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.advanced.other")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminSettings.advanced.onedriveChunkRetries")}</Label>
            <Input type="number" value={data.onedrive_chunk_retries} onChange={(e) => update("onedrive_chunk_retries", Number(e.target.value))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("adminSettings.advanced.isResetAfterUploadFailed")}</Label>
            <Switch checked={data.is_reset_after_upload_failed} onCheckedChange={(v) => update("is_reset_after_upload_failed", v)} />
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
