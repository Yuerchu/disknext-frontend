import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSettings } from "@/api";
import { useSettings } from "@/hooks/use-settings";

export default function TaskSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, saving, save, update } = useSettings(
    adminSettings.task,
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
      {/* 任务设置 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSettings.task.title")}</CardTitle>
          <CardDescription>{t("adminSettings.task.titleDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminSettings.task.maxWorkerNum")}</Label>
              <Input type="number" value={data.max_worker_num} onChange={(e) => update("max_worker_num", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminSettings.task.maxParallelTransfer")}</Label>
              <Input type="number" value={data.max_parallel_transfer} onChange={(e) => update("max_parallel_transfer", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminSettings.task.cronGarbageCollect")}</Label>
            <Input value={data.cron_garbage_collect} onChange={(e) => update("cron_garbage_collect", e.target.value)} className="font-mono" />
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
