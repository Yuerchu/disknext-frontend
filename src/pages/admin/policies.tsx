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
import { Plus, Pencil, Trash2, Loader2, Database } from "lucide-react";
import { adminPolicy } from "@/api";
import type { AdminPolicySummary, PolicyType } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function AdminPoliciesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AdminPolicySummary | null>(null);

  const queryParams = { offset: page * PAGE_SIZE, limit: PAGE_SIZE };

  const { data, isLoading: loading } = useQuery({
    queryKey: queryKeys.adminPolicies(queryParams),
    queryFn: () => adminPolicy.list(queryParams),
    placeholderData: keepPreviousData,
  });

  const policies = data?.items ?? [];
  const total = data?.count ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminPolicy.delete(id),
    onSuccess: () => {
      toast.success(t("adminPolicy.deleteSuccess"));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "policies"] });
    },
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const policyTypeLabel = (type: PolicyType) => t(`adminPolicy.type_${type}`);

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
        <h2 className="text-lg font-semibold">{t("adminPolicy.title")}</h2>
        <Button size="sm" onClick={() => navigate("/admin/policies/new")}>
          <Plus className="mr-2 size-4" />
          {t("adminPolicy.createPolicy")}
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
      ) : policies.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Database />
            </EmptyMedia>
            <EmptyTitle>{t("adminPolicy.noPolicies")}</EmptyTitle>
            <EmptyDescription>{t("adminPolicy.noPoliciesHint")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminPolicy.name")}</TableHead>
                <TableHead className="w-32">{t("adminPolicy.policyType")}</TableHead>
                <TableHead className="w-28 text-right">{t("adminPolicy.maxSize")}</TableHead>
                <TableHead className="w-20">{t("adminPolicy.private")}</TableHead>
                <TableHead className="w-24 text-right">{t("adminPolicy.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell>
                    <button
                      className="font-medium text-left hover:underline cursor-pointer"
                      onClick={() => navigate(`/admin/policies/${policy.id}`)}
                    >
                      {policy.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{policyTypeLabel(policy.policy_type)}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {policy.max_size === 0 ? "∞" : formatBytes(policy.max_size)}
                  </TableCell>
                  <TableCell>
                    {policy.is_private && <Badge variant="outline">{t("adminPolicy.private")}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`/admin/policies/${policy.id}`)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteTarget(policy)}>
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
                      <PaginationLink isActive={p === page} onClick={() => setPage(p)}>
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
            <DialogTitle>{t("adminPolicy.deletePolicy")}</DialogTitle>
            <DialogDescription>{t("adminPolicy.deleteConfirm", { name: deleteTarget?.name })}</DialogDescription>
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
