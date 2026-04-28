import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { share, resolveErrorMessage } from "@/api";

interface CreateShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
  onSuccess?: () => void;
}

export function CreateShareDialog({ open, onOpenChange, fileId, fileName, onSuccess }: CreateShareDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresPreset, setExpiresPreset] = useState("never");
  const [remainDownloads, setRemainDownloads] = useState("");
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const resetForm = () => {
    setPassword("");
    setExpiresPreset("never");
    setRemainDownloads("");
    setPreviewEnabled(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let expires: string | null = null;
      if (expiresPreset !== "never") {
        const days = Number(expiresPreset);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expires = date.toISOString();
      }

      await share.create({
        file_id: fileId,
        password: password || null,
        expires,
        remain_downloads: remainDownloads ? Number(remainDownloads) : null,
        preview_enabled: previewEnabled,
      });

      toast.success(t("share.createSuccess"));
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("share.createShare")}</DialogTitle>
            <DialogDescription>{fileName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="share-password">{t("share.password")}</Label>
              <Input
                id="share-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("share.passwordHint")}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("share.expires")}</Label>
              <Select value={expiresPreset} onValueChange={(v) => { if (v) setExpiresPreset(v); }} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">{t("share.expiresNever")}</SelectItem>
                  <SelectItem value="1">{t("share.expires1d")}</SelectItem>
                  <SelectItem value="7">{t("share.expires7d")}</SelectItem>
                  <SelectItem value="30">{t("share.expires30d")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="share-downloads">{t("share.remainDownloads")}</Label>
              <Input
                id="share-downloads"
                type="number"
                min="0"
                value={remainDownloads}
                onChange={(e) => setRemainDownloads(e.target.value)}
                placeholder={t("share.remainDownloadsHint")}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="share-preview">{t("share.previewEnabled")}</Label>
              <Switch
                id="share-preview"
                checked={previewEnabled}
                onCheckedChange={setPreviewEnabled}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("share.createShare")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
