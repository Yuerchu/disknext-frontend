import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty";
import { userSettings, resolveErrorMessage } from "@/api";
import type { UserFileAppDefaultResponse } from "@/api";

export default function ViewersSection() {
  const { t } = useTranslation();
  const [viewers, setViewers] = useState<UserFileAppDefaultResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserFileAppDefaultResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadViewers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userSettings.listDefaultViewers();
      setViewers(data);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadViewers(); }, [loadViewers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userSettings.deleteDefaultViewer(deleteTarget.id);
      toast.success(t("userSettings.viewers.deleted"));
      setDeleteDialogOpen(false);
      loadViewers();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("userSettings.viewers.title")}</CardTitle>
          <CardDescription>{t("userSettings.viewers.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : viewers.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Eye />
                </EmptyMedia>
                <EmptyTitle>{t("userSettings.viewers.noViewers")}</EmptyTitle>
                <EmptyDescription>{t("userSettings.viewers.noViewersHint")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("userSettings.viewers.extension")}</TableHead>
                  <TableHead>{t("userSettings.viewers.viewer")}</TableHead>
                  <TableHead>{t("userSettings.viewers.appType")}</TableHead>
                  <TableHead className="text-right">{t("userSettings.viewers.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewers.map((viewer) => (
                  <TableRow key={viewer.id}>
                    <TableCell className="font-mono">.{viewer.extension}</TableCell>
                    <TableCell className="font-medium">{viewer.app.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{viewer.app.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget(viewer);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("userSettings.viewers.deleteViewerTitle")}</DialogTitle>
            <DialogDescription>
              {t("userSettings.viewers.deleteConfirm", { ext: deleteTarget?.extension })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
