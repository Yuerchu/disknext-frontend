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
import { Loader2 } from "lucide-react";
import { file, resolveErrorMessage } from "@/api";

// ==================== 新建文件夹 ====================

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  onSuccess: () => void;
}

export function CreateFolderDialog({ open, onOpenChange, parentId, onSuccess }: CreateFolderDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await file.createDirectory({ parent_id: parentId, name: name.trim() });
      toast.success(t("file.createFolderSuccess"));
      onOpenChange(false);
      setName("");
      onSuccess();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setName(""); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("contextMenu.createFolder")}</DialogTitle>
            <DialogDescription>{t("file.createFolderHint")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">{t("file.name")}</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("file.folderNamePlaceholder")}
              autoFocus
              disabled={loading}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 新建文件 ====================

interface CreateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  onSuccess: () => void;
}

export function CreateFileDialog({ open, onOpenChange, parentId, onSuccess }: CreateFileDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await file.createFile({ parent_id: parentId, name: name.trim() });
      toast.success(t("file.createFileSuccess"));
      onOpenChange(false);
      setName("");
      onSuccess();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setName(""); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("contextMenu.createFile")}</DialogTitle>
            <DialogDescription>{t("file.createFileHint")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="file-name">{t("file.name")}</Label>
            <Input
              id="file-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("file.fileNamePlaceholder")}
              autoFocus
              disabled={loading}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 重命名 ====================

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string;
  currentName: string;
  onSuccess: () => void;
}

export function RenameDialog({ open, onOpenChange, entryId, currentName, onSuccess }: RenameDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;
    setLoading(true);
    try {
      await file.updateObject(entryId, { name: name.trim() });
      toast.success(t("file.renameSuccess"));
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("common.rename")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-input">{t("file.name")}</Label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={loading}
              className="mt-2"
              onFocus={(e) => {
                // 选中文件名（不含扩展名）
                const dot = currentName.lastIndexOf(".");
                if (dot > 0) e.target.setSelectionRange(0, dot);
                else e.target.select();
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || name.trim() === currentName}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 删除确认 ====================

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  names: string[];
  onSuccess: () => void;
}

export function DeleteDialog({ open, onOpenChange, ids, names, onSuccess }: DeleteDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await file.deleteObjects({ ids });
      toast.success(t("file.deleteSuccess", { count: ids.length }));
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("file.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {ids.length === 1
              ? t("file.deleteConfirmSingle", { name: names[0] })
              : t("file.deleteConfirmMultiple", { count: ids.length })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
