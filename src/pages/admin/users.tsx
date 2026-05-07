import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Pencil, Trash2, Loader2, UserIcon, Search, RotateCcw, ChevronsUpDown } from "lucide-react";
import { adminUser, adminGroup } from "@/api";
import type { AdminUserCreateRequest, UserStatus } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

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
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);

  // Draft filter values (not yet applied)
  const [draftEmail, setDraftEmail] = useState("");
  const [draftNickname, setDraftNickname] = useState("");
  const [draftGroup, setDraftGroup] = useState("");
  const [draftStatus, setDraftStatus] = useState("");

  // Applied filter values (used for querying)
  const [emailFilter, setEmailFilter] = useState("");
  const [nicknameFilter, setNicknameFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Group combobox open state
  const [groupOpen, setGroupOpen] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [formGroupOpen, setFormGroupOpen] = useState(false);

  // Delete dialog
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  const userQueryParams = {
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    email_contains: emailFilter || undefined,
    nickname_contains: nicknameFilter || undefined,
    group_id: groupFilter || undefined,
    status: (statusFilter as UserStatus) || undefined,
  };

  const { data: usersData, isLoading: loading } = useQuery({
    queryKey: queryKeys.adminUsers(userQueryParams as Record<string, unknown>),
    queryFn: () => adminUser.list(userQueryParams),
    placeholderData: keepPreviousData,
  });

  const users = usersData?.items ?? [];
  const total = usersData?.count ?? 0;

  // Groups for filter & create dialog
  const { data: groupsData } = useQuery({
    queryKey: queryKeys.adminGroups({ limit: 100 }),
    queryFn: () => adminGroup.list({ limit: 100 }),
  });

  const groups = groupsData?.items ?? [];

  const handleSearch = () => {
    setEmailFilter(draftEmail);
    setNicknameFilter(draftNickname);
    setGroupFilter(draftGroup);
    setStatusFilter(draftStatus);
    setPage(0);
  };

  const handleReset = () => {
    setDraftEmail("");
    setDraftNickname("");
    setDraftGroup("");
    setDraftStatus("");
    setEmailFilter("");
    setNicknameFilter("");
    setGroupFilter("");
    setStatusFilter("");
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

  const createMutation = useMutation({
    mutationFn: (req: AdminUserCreateRequest) => adminUser.create(req),
    onSuccess: () => {
      toast.success(t("adminUser.createSuccess"));
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminUser.delete(ids),
    onSuccess: (_data, ids) => {
      toast.success(t("adminUser.deleteSuccess", { count: ids.length }));
      setDeleteIds([]);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const handleCreate = () => {
    if (!formEmail.trim() || !formNickname.trim() || !formGroupId) return;
    createMutation.mutate({
      email: formEmail.trim(),
      password: formPassword || undefined,
      nickname: formNickname.trim(),
      group_id: formGroupId,
    });
  };

  const handleBatchDelete = () => {
    if (deleteIds.length === 0) return;
    deleteMutation.mutate(deleteIds);
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

  const statusFilterLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t("adminUser.statusActive"),
      admin_banned: t("adminUser.statusAdminBanned"),
      system_banned: t("adminUser.statusSystemBanned"),
    };
    return map[status] ?? t("adminUser.allStatuses");
  };

  // Get display name for the selected group
  const selectedGroupName = draftGroup
    ? groups.find((g) => g.id === draftGroup)?.name
    : undefined;

  // Generate pagination page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 2) pages.push("ellipsis");
      const start = Math.max(1, page - 1);
      const end = Math.min(totalPages - 2, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 3) pages.push("ellipsis");
      pages.push(totalPages - 1);
    }
    return pages;
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
          <Input
            className="h-8 w-48"
            placeholder={t("adminUser.emailPlaceholder")}
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">{t("adminUser.filterByNickname")}</Label>
          <Input
            className="h-8 w-40"
            placeholder={t("adminUser.nicknamePlaceholder")}
            value={draftNickname}
            onChange={(e) => setDraftNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">{t("adminUser.filterByGroup")}</Label>
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={groupOpen}
                className="h-8 w-48 justify-between font-normal"
              >
                <span className="truncate">
                  {selectedGroupName ?? t("adminUser.allGroups")}
                </span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <Command>
                <CommandInput placeholder={t("common.searchGroup")} />
                <CommandList>
                  <CommandEmpty>{t("common.noData")}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value={t("adminUser.allGroups")}
                      data-checked={!draftGroup}
                      onSelect={() => {
                        setDraftGroup("");
                        setGroupOpen(false);
                      }}
                    >
                      {t("adminUser.allGroups")}
                    </CommandItem>
                    {groups.map((g) => (
                      <CommandItem
                        key={g.id}
                        value={g.name}
                        data-checked={draftGroup === g.id}
                        onSelect={() => {
                          setDraftGroup(g.id);
                          setGroupOpen(false);
                        }}
                      >
                        {g.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">{t("adminUser.filterByStatus")}</Label>
          <Select value={draftStatus || "all"} onValueChange={(v) => setDraftStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-36">
              {statusFilterLabel(draftStatus)}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("adminUser.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("adminUser.statusActive")}</SelectItem>
              <SelectItem value="admin_banned">{t("adminUser.statusAdminBanned")}</SelectItem>
              <SelectItem value="system_banned">{t("adminUser.statusSystemBanned")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-8" onClick={handleSearch}>
          <Search className="mr-2 size-4" />
          {t("common.search")}
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={handleReset}>
          <RotateCcw className="mr-2 size-4" />
          {t("common.reset")}
        </Button>
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
                <TableHead className="w-40 text-right">{t("adminUser.registeredAt")}</TableHead>
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
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    text={t("common.previousPage")}
                    onClick={() => setPage(Math.max(0, page - 1))}
                    className={cn(page === 0 && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
                {getPageNumbers().map((p, i) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`e${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p)}
                      >
                        {p + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    text={t("common.nextPage")}
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    className={cn(page >= totalPages - 1 && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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
              <Popover open={formGroupOpen} onOpenChange={setFormGroupOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={formGroupOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {formGroupId
                        ? groups.find((g) => g.id === formGroupId)?.name ?? formGroupId
                        : t("adminUser.selectGroup")}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("common.searchGroup")} />
                    <CommandList>
                      <CommandEmpty>{t("common.noData")}</CommandEmpty>
                      <CommandGroup>
                        {groups.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={g.name}
                            data-checked={formGroupId === g.id}
                            onSelect={() => {
                              setFormGroupId(g.id);
                              setFormGroupOpen(false);
                            }}
                          >
                            {g.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !formEmail.trim() || !formNickname.trim() || !formGroupId}>
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
            <Button variant="outline" onClick={() => setDeleteIds([])} disabled={deleteMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleBatchDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
