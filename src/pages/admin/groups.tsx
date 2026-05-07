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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Pencil, Trash2, Loader2, Users, Shield } from "lucide-react";
import { adminGroup } from "@/api";
import type { AdminGroupResponse } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

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
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<AdminGroupResponse | null>(null);

  const queryParams = { offset: page * PAGE_SIZE, limit: PAGE_SIZE };

  const { data, isLoading: loading } = useQuery({
    queryKey: queryKeys.adminGroups(queryParams),
    queryFn: () => adminGroup.list(queryParams),
    placeholderData: keepPreviousData,
  });

  const groups = data?.items ?? [];
  const total = data?.count ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminGroup.delete(id),
    onSuccess: () => {
      toast.success(t("adminGroup.deleteSuccess"));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
        <h2 className="text-lg font-semibold">{t("adminGroup.title")}</h2>
        <Button size="sm" onClick={() => navigate("/admin/groups/new")}>
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
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`/admin/groups/${group.id}`)}>
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminGroup.deleteGroup")}</DialogTitle>
            <DialogDescription>{t("adminGroup.deleteConfirm", { name: deleteTarget?.name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
