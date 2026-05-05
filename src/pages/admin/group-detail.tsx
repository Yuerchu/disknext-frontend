import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ArrowLeft, Loader2, Save, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { adminGroup, resolveErrorMessage } from "@/api";
import type { AdminGroupResponse, AdminGroupUpdateRequest, AdminUserResponse } from "@/api";
import { ScopePicker } from "@/components/admin/scope-picker";

const MEMBERS_PAGE_SIZE = 20;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminGroupDetailPage() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<AdminGroupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formMaxStorage, setFormMaxStorage] = useState("0");
  const [formSpeedLimit, setFormSpeedLimit] = useState("0");
  const [formAdmin, setFormAdmin] = useState(false);
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formPolicyIds, setFormPolicyIds] = useState("");

  // Members
  const [members, setMembers] = useState<AdminUserResponse[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPage, setMembersPage] = useState(0);
  const [membersLoading, setMembersLoading] = useState(true);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await adminGroup.get(groupId);
      setGroup(data);
      setFormName(data.name);
      setFormMaxStorage(String(data.max_storage));
      setFormSpeedLimit(String(data.speed_limit));
      setFormAdmin(data.admin);
      setFormScopes([...data.scopes]);
      setFormPolicyIds(data.policy_ids.join(", "));
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    setMembersLoading(true);
    try {
      const data = await adminGroup.members(groupId, {
        offset: membersPage * MEMBERS_PAGE_SIZE,
        limit: MEMBERS_PAGE_SIZE,
      });
      setMembers(data.items);
      setMembersTotal(data.count);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setMembersLoading(false);
    }
  }, [groupId, membersPage]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleSave = async () => {
    if (!groupId || !formName.trim()) return;
    setSaving(true);
    try {
      const policyIds = formPolicyIds.trim() ? formPolicyIds.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const req: AdminGroupUpdateRequest = {
        name: formName.trim(),
        max_storage: parseInt(formMaxStorage) || 0,
        speed_limit: parseInt(formSpeedLimit) || 0,
        admin: formAdmin,
        scopes: formScopes,
        policy_ids: policyIds,
      };
      await adminGroup.update(groupId, req);
      toast.success(t("adminGroup.updateSuccess"));
      loadGroup();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !group) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const membersTotalPages = Math.ceil(membersTotal / MEMBERS_PAGE_SIZE);

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate("/admin/groups")}>
        <ArrowLeft className="mr-2 size-4" />
        {t("common.back")}
      </Button>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminGroup.basicInfo")}</CardTitle>
          <CardDescription>{t("adminGroup.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminGroup.name")}</Label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("adminGroup.namePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminGroup.maxStorage")}</Label>
              <Input type="number" min="0" value={formMaxStorage} onChange={(e) => setFormMaxStorage(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("adminGroup.maxStorageHint")}</p>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminGroup.speedLimit")}</Label>
              <Input type="number" min="0" value={formSpeedLimit} onChange={(e) => setFormSpeedLimit(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("adminGroup.speedLimitHint")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={formAdmin} onCheckedChange={setFormAdmin} />
            <div>
              <Label>{t("adminGroup.admin")}</Label>
              <p className="text-xs text-muted-foreground">{t("adminGroup.adminDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminGroup.permissions")}</CardTitle>
          <CardDescription>{t("adminGroup.permissionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScopePicker value={formScopes} onChange={setFormScopes} />
        </CardContent>
      </Card>

      {/* Storage Policies */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminGroup.policies")}</CardTitle>
          <CardDescription>{t("adminGroup.policiesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminGroup.policyIds")}</Label>
            <Input value={formPolicyIds} onChange={(e) => setFormPolicyIds(e.target.value)} placeholder={t("adminGroup.policyIdsPlaceholder")} />
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

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminGroup.members")} ({membersTotal})</CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>{t("adminGroup.noMembers")}</EmptyTitle>
                <EmptyDescription />
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("adminUser.email")}</TableHead>
                    <TableHead>{t("adminUser.nickname")}</TableHead>
                    <TableHead className="w-28 text-right">{t("adminUser.storage")}</TableHead>
                    <TableHead className="w-40 text-right">{t("adminUser.createdAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <button
                          className="hover:underline cursor-pointer text-left"
                          onClick={() => navigate(`/admin/users/${member.id}`)}
                        >
                          {member.email}
                        </button>
                      </TableCell>
                      <TableCell>{member.nickname}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatBytes(member.storage)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(member.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {membersTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button variant="outline" size="icon" className="size-8" disabled={membersPage === 0} onClick={() => setMembersPage(membersPage - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {membersPage + 1} / {membersTotalPages}
                  </span>
                  <Button variant="outline" size="icon" className="size-8" disabled={membersPage >= membersTotalPages - 1} onClick={() => setMembersPage(membersPage + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
