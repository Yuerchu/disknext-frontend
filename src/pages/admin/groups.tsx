import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Users, Shield } from "lucide-react";
import { adminGroup, resolveErrorMessage } from "@/api";
import type { AdminGroupResponse, AdminGroupCreateRequest, AdminGroupUpdateRequest } from "@/api";
import { ScopePicker } from "@/components/admin/scope-picker";

const PAGE_SIZE = 20;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function AdminGroupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<AdminGroupResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminGroupResponse | null>(null);
  const [formName, setFormName] = useState("");
  const [formMaxStorage, setFormMaxStorage] = useState("0");
  const [formSpeedLimit, setFormSpeedLimit] = useState("0");
  const [formAdmin, setFormAdmin] = useState(false);
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formPolicyIds, setFormPolicyIds] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<AdminGroupResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGroup.list({ offset: page * PAGE_SIZE, limit: PAGE_SIZE });
      setGroups(data.items);
      setTotal(data.count);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const openCreateDialog = () => {
    setEditTarget(null);
    setFormName("");
    setFormMaxStorage("0");
    setFormSpeedLimit("0");
    setFormAdmin(false);
    setFormScopes([]);
    setFormPolicyIds("");
    setDialogOpen(true);
  };

  const openEditDialog = (group: AdminGroupResponse) => {
    setEditTarget(group);
    setFormName(group.name);
    setFormMaxStorage(String(group.max_storage));
    setFormSpeedLimit(String(group.speed_limit));
    setFormAdmin(group.admin);
    setFormScopes([...group.scopes]);
    setFormPolicyIds(group.policy_ids.join(", "));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      const policyIds = formPolicyIds.trim() ? formPolicyIds.split(",").map((s) => s.trim()).filter(Boolean) : [];

      if (editTarget) {
        const req: AdminGroupUpdateRequest = {
          name: formName.trim(),
          max_storage: parseInt(formMaxStorage) || 0,
          speed_limit: parseInt(formSpeedLimit) || 0,
          admin: formAdmin,
          scopes: formScopes,
          policy_ids: policyIds,
        };
        await adminGroup.update(editTarget.id, req);
        toast.success(t("adminGroup.updateSuccess"));
      } else {
        const req: AdminGroupCreateRequest = {
          name: formName.trim(),
          max_storage: parseInt(formMaxStorage) || 0,
          speed_limit: parseInt(formSpeedLimit) || 0,
          admin: formAdmin,
          scopes: formScopes,
          policy_ids: policyIds,
        };
        await adminGroup.create(req);
        toast.success(t("adminGroup.createSuccess"));
      }
      setDialogOpen(false);
      loadGroups();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminGroup.delete(deleteTarget.id);
      toast.success(t("adminGroup.deleteSuccess"));
      setDeleteTarget(null);
      loadGroups();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("adminGroup.title")}</h2>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          {t("adminGroup.createGroup")}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{t("adminGroup.noGroups")}</EmptyTitle>
            <EmptyDescription>{t("adminGroup.noGroupsHint")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminGroup.name")}</TableHead>
                <TableHead className="w-28 text-right">{t("adminGroup.maxStorage")}</TableHead>
                <TableHead className="w-28 text-right">{t("adminGroup.speedLimit")}</TableHead>
                <TableHead className="w-20 text-right">{t("adminGroup.userCount")}</TableHead>
                <TableHead className="w-24">{t("adminGroup.admin")}</TableHead>
                <TableHead className="w-24 text-right">{t("adminGroup.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <button
                      className="font-medium text-left hover:underline cursor-pointer"
                      onClick={() => navigate(`/admin/groups/${group.id}`)}
                    >
                      {group.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {group.max_storage === 0 ? "∞" : formatBytes(group.max_storage)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {group.speed_limit === 0 ? "∞" : `${group.speed_limit} KB/s`}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{group.user_count}</TableCell>
                  <TableCell>
                    {group.admin && (
                      <Badge variant="secondary">
                        <Shield className="mr-1 size-3" />
                        Admin
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(group)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteTarget(group)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" className="size-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("adminGroup.editGroup") : t("adminGroup.createGroup")}</DialogTitle>
            <DialogDescription>
              {editTarget ? t("adminGroup.basicInfoDesc") : t("adminGroup.noGroupsHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <div className="grid gap-2">
              <Label>{t("adminGroup.scopes")}</Label>
              <ScopePicker value={formScopes} onChange={setFormScopes} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminGroup.policyIds")}</Label>
              <Input value={formPolicyIds} onChange={(e) => setFormPolicyIds(e.target.value)} placeholder={t("adminGroup.policyIdsPlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !formName.trim()}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editTarget ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminGroup.deleteGroup")}</DialogTitle>
            <DialogDescription>{t("adminGroup.deleteConfirm", { name: deleteTarget?.name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
