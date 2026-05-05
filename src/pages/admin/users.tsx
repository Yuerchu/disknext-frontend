import { useCallback, useEffect, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, UserIcon } from "lucide-react";
import { adminUser, adminGroup, resolveErrorMessage } from "@/api";
import type { AdminUserResponse, AdminUserCreateRequest, AdminGroupResponse, UserStatus } from "@/api";

const PAGE_SIZE = 20;

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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "secondary",
  admin_banned: "destructive",
  system_banned: "destructive",
};

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<AdminGroupResponse[]>([]);

  // Filters
  const [emailFilter, setEmailFilter] = useState("");
  const [nicknameFilter, setNicknameFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminUser.list({
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        email_contains: emailFilter || undefined,
        nickname_contains: nicknameFilter || undefined,
        group_id: groupFilter || undefined,
        status: (statusFilter as UserStatus) || undefined,
      });
      setUsers(data.items);
      setTotal(data.count);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, emailFilter, nicknameFilter, groupFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Load groups for filter & create dialog
  useEffect(() => {
    adminGroup.list({ limit: 200 }).then((data) => {
      setGroups(data.items);
    }).catch(() => {});
  }, []);

  // Debounced filter change
  const handleEmailChange = (v: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setEmailFilter(v);
      setPage(0);
    }, 300);
  };

  const handleNicknameChange = (v: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setNicknameFilter(v);
      setPage(0);
    }, 300);
  };

  const handleGroupFilterChange = (v: string | null) => {
    setGroupFilter(!v || v === "__all__" ? "" : v);
    setPage(0);
  };

  const handleStatusFilterChange = (v: string | null) => {
    setStatusFilter(!v || v === "__all__" ? "" : v);
    setPage(0);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const openCreateDialog = () => {
    setFormEmail("");
    setFormPassword("");
    setFormNickname("");
    setFormGroupId(groups[0]?.id ?? "");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!formEmail.trim() || !formNickname.trim() || !formGroupId) return;
    setSubmitting(true);
    try {
      const req: AdminUserCreateRequest = {
        email: formEmail.trim(),
        password: formPassword || undefined,
        nickname: formNickname.trim(),
        group_id: formGroupId,
      };
      await adminUser.create(req);
      toast.success(t("adminUser.createSuccess"));
      setCreateOpen(false);
      loadUsers();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (deleteIds.length === 0) return;
    setDeleting(true);
    try {
      await adminUser.delete(deleteIds);
      toast.success(t("adminUser.deleteSuccess", { count: deleteIds.length }));
      setDeleteIds([]);
      setSelected(new Set());
      loadUsers();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t("adminUser.statusActive"),
      admin_banned: t("adminUser.statusAdminBanned"),
      system_banned: t("adminUser.statusSystemBanned"),
    };
    return map[status] ?? status;
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("adminUser.title")}</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {t("adminUser.selectedCount", { count: selected.size })}
              </span>
              <Button variant="destructive" size="sm" onClick={() => setDeleteIds([...selected])}>
                <Trash2 className="mr-2 size-4" />
                {t("adminUser.batchDelete")}
              </Button>
            </>
          )}
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            {t("adminUser.createUser")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label className="text-xs">{t("adminUser.filterByEmail")}</Label>
          <Input className="h-8 w-48" placeholder={t("adminUser.emailPlaceholder")} onChange={(e) => handleEmailChange(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">{t("adminUser.filterByNickname")}</Label>
          <Input className="h-8 w-40" placeholder={t("adminUser.nicknamePlaceholder")} onChange={(e) => handleNicknameChange(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">{t("adminUser.filterByGroup")}</Label>
          <Select value={groupFilter || "__all__"} onValueChange={handleGroupFilterChange}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("adminUser.allGroups")}</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">{t("adminUser.filterByStatus")}</Label>
          <Select value={statusFilter || "__all__"} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("adminUser.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("adminUser.statusActive")}</SelectItem>
              <SelectItem value="admin_banned">{t("adminUser.statusAdminBanned")}</SelectItem>
              <SelectItem value="system_banned">{t("adminUser.statusSystemBanned")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-4" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserIcon />
            </EmptyMedia>
            <EmptyTitle>{t("adminUser.noUsers")}</EmptyTitle>
            <EmptyDescription>{t("adminUser.noUsersHint")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === users.length && users.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>{t("adminUser.email")}</TableHead>
                <TableHead>{t("adminUser.nickname")}</TableHead>
                <TableHead>{t("adminUser.group")}</TableHead>
                <TableHead className="w-28">{t("adminUser.status")}</TableHead>
                <TableHead className="w-24 text-right">{t("adminUser.storage")}</TableHead>
                <TableHead className="w-40 text-right">{t("adminUser.createdAt")}</TableHead>
                <TableHead className="w-24 text-right">{t("adminUser.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(user.id)}
                      onCheckedChange={() => toggleSelect(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      className="font-medium text-left hover:underline cursor-pointer"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      {user.email}
                    </button>
                  </TableCell>
                  <TableCell>{user.nickname}</TableCell>
                  <TableCell className="text-muted-foreground">{user.group_name}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[user.scopes.includes("admin_banned") ? "admin_banned" : "active"] ?? "outline"}>
                      {statusLabel("active")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatBytes(user.storage)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`/admin/users/${user.id}`)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteIds([user.id])}>
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

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("adminUser.createUser")}</DialogTitle>
            <DialogDescription>{t("adminUser.basicInfoDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("adminUser.email")}</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder={t("adminUser.emailPlaceholder")} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminUser.password")}</Label>
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={t("adminUser.passwordPlaceholder")} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminUser.nickname")}</Label>
              <Input value={formNickname} onChange={(e) => setFormNickname(e.target.value)} placeholder={t("adminUser.nicknamePlaceholder")} />
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !formEmail.trim() || !formNickname.trim() || !formGroupId}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteIds.length > 0} onOpenChange={(v) => { if (!v) setDeleteIds([]); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminUser.deleteUser")}</DialogTitle>
            <DialogDescription>{t("adminUser.deleteConfirm", { count: deleteIds.length })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteIds([])} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleBatchDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
