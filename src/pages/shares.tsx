import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Trash2, Link2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { share } from "@/api";
import type { ShareResponse } from "@/api";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

type FilterTab = "all" | "active" | "expired";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SharesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<FilterTab>("all");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ShareResponse | null>(null);

  const expired = filter === "all" ? undefined : filter === "expired";
  const queryParams = { offset: page * PAGE_SIZE, limit: PAGE_SIZE, expired };

  const { data, isLoading: loading } = useQuery({
    queryKey: queryKeys.shares(queryParams as Record<string, unknown>),
    queryFn: () => share.list(queryParams),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const total = data?.count ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => share.delete(id),
    onSuccess: () => {
      toast.success(t("share.deleteSuccess"));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });

  const handleFilterChange = (value: string) => {
    setFilter(value as FilterTab);
    setPage(0);
  };

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}/s/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t("share.linkCopied"));
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={handleFilterChange}>
          <TabsList>
            <TabsTrigger value="all">{t("share.all")}</TabsTrigger>
            <TabsTrigger value="active">{t("share.active")}</TabsTrigger>
            <TabsTrigger value="expired">{t("share.expired")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Link2 />
            </EmptyMedia>
            <EmptyTitle>{t("share.noShares")}</EmptyTitle>
            <EmptyDescription>{t("share.noSharesHint")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("file.name")}</TableHead>
                <TableHead className="w-16 text-right">{t("share.views")}</TableHead>
                <TableHead className="w-16 text-right">{t("share.downloads")}</TableHead>
                <TableHead className="w-28">{t("share.status")}</TableHead>
                <TableHead className="w-40 text-right">{t("share.createdAt")}</TableHead>
                <TableHead className="w-24 text-right">{t("share.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <span className="truncate">{item.file_id.slice(0, 8)}…</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.views}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.downloads}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.is_expired ? (
                        <Badge variant="destructive">{t("share.expired")}</Badge>
                      ) : item.expires ? (
                        <Badge variant="secondary">{t("share.active")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("share.permanent")}</Badge>
                      )}
                      {item.has_password && (
                        <Badge variant="outline">{t("share.hasPassword")}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(item.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => handleCopyLink(item.code)}>
                        <Copy className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteTarget(item)}>
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("share.deleteShare")}</DialogTitle>
            <DialogDescription>{t("share.deleteConfirm")}</DialogDescription>
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
