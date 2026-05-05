import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Save, RotateCw } from "lucide-react";
import { adminUser, adminGroup, resolveErrorMessage } from "@/api";
import type { AdminUserResponse, AdminUserUpdateRequest, AdminGroupResponse, UserStatus } from "@/api";
import { ScopePicker } from "@/components/admin/scope-picker";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function AdminUserDetailPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUserResponse | null>(null);
  const [groups, setGroups] = useState<AdminGroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [formStatus, setFormStatus] = useState<UserStatus>("active");
  const [formScore, setFormScore] = useState("0");
  const [formStorage, setFormStorage] = useState("0");
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formGroupExpires, setFormGroupExpires] = useState("");

  const loadUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await adminUser.get(userId);
      setUser(data);
      setFormEmail(data.email);
      setFormNickname(data.nickname);
      setFormPhone("");
      setFormGroupId(data.group_id);
      setFormStatus("active");
      setFormScore("0");
      setFormStorage(String(data.storage));
      setFormScopes([...data.scopes]);
      setFormGroupExpires(data.group_expires ? data.group_expires.slice(0, 16) : "");
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    adminGroup.list({ limit: 200 }).then((data) => {
      setGroups(data.items);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const req: AdminUserUpdateRequest = {
        email: formEmail.trim() || null,
        nickname: formNickname.trim() || null,
        phone: formPhone.trim() || null,
        group_id: formGroupId || null,
        status: formStatus,
        score: parseInt(formScore) || 0,
        storage: parseInt(formStorage) || 0,
        scopes: formScopes,
        group_expires: formGroupExpires ? new Date(formGroupExpires).toISOString() : null,
      };
      await adminUser.update(userId, req);
      toast.success(t("adminUser.updateSuccess"));
      loadUser();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCalibrate = async () => {
    if (!userId) return;
    setCalibrating(true);
    try {
      const result = await adminUser.calibrate(userId);
      toast.success(t("adminUser.calibrateSuccess", {
        difference: result.difference,
        fileCount: result.file_count,
      }));
      setFormStorage(String(result.current_storage));
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setCalibrating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate("/admin/users")}>
        <ArrowLeft className="mr-2 size-4" />
        {t("common.back")}
      </Button>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminUser.basicInfo")}</CardTitle>
          <CardDescription>{t("adminUser.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminUser.email")}</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder={t("adminUser.emailPlaceholder")} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminUser.nickname")}</Label>
              <Input value={formNickname} onChange={(e) => setFormNickname(e.target.value)} placeholder={t("adminUser.nicknamePlaceholder")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminUser.phone")}</Label>
            <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder={t("adminUser.phonePlaceholder")} />
          </div>
        </CardContent>
      </Card>

      {/* Group & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminUser.groupAndPermissions")}</CardTitle>
          <CardDescription>{t("adminUser.groupAndPermissionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminUser.group")}</Label>
              <Select value={formGroupId} onValueChange={(v) => { if (v) setFormGroupId(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder={t("adminUser.selectGroup")} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminUser.status")}</Label>
              <Select value={formStatus} onValueChange={(v) => { if (v) setFormStatus(v as UserStatus); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("adminUser.statusActive")}</SelectItem>
                  <SelectItem value="admin_banned">{t("adminUser.statusAdminBanned")}</SelectItem>
                  <SelectItem value="system_banned">{t("adminUser.statusSystemBanned")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminUser.score")}</Label>
              <Input type="number" min="0" value={formScore} onChange={(e) => setFormScore(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminUser.groupExpires")}</Label>
              <Input type="datetime-local" value={formGroupExpires} onChange={(e) => setFormGroupExpires(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminUser.scopes")}</Label>
            <ScopePicker value={formScopes} onChange={setFormScopes} />
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminUser.storageSection")}</CardTitle>
          <CardDescription>{t("adminUser.storageSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminUser.storage")}</Label>
              <Input type="number" min="0" value={formStorage} onChange={(e) => setFormStorage(e.target.value)} />
              <p className="text-xs text-muted-foreground">{formatBytes(parseInt(formStorage) || 0)}</p>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleCalibrate} disabled={calibrating}>
                {calibrating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RotateCw className="mr-2 size-4" />}
                {t("adminUser.calibrateStorage")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
