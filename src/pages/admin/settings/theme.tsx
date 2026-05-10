import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, Star, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminTheme } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { THEME_STYLES, THEME_BASE_COLORS, THEME_COLORS, THEME_RADII, resolveThemeCssVars } from "@/lib/theme-registry";
import type { ThemeConfigBase, ThemePresetResponse, ThemeStyle, ThemeBaseColor, ThemeColor, ThemeRadius } from "@/api/types";

const DEFAULT_CONFIG: ThemeConfigBase = {
  style: "nova",
  base_color: "neutral",
  theme_color: "neutral",
  chart_color: "neutral",
  radius: "medium",
};

function ColorSwatch({ color }: { color: string }) {
  const vars = resolveThemeCssVars(
    THEME_BASE_COLORS.includes(color as ThemeBaseColor) ? color as ThemeBaseColor : "neutral",
    color as ThemeColor,
    color as ThemeColor,
    "medium",
  );
  return (
    <span
      className="inline-flex size-3.5 rounded-full border border-border shrink-0"
      style={{ background: vars.light.primary }}
    />
  );
}

function ColorLabel({ color, t }: { color: string; t: (key: string) => string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ColorSwatch color={color} />
      {t(`adminTheme.colors.${color}`)}
    </span>
  );
}

function ThemePreview({ config }: { config: ThemeConfigBase }) {
  const vars = resolveThemeCssVars(config.base_color, config.theme_color, config.chart_color, config.radius);
  const radius = { default: "0.625rem", none: "0", small: "0.45rem", medium: "0.625rem", large: "0.875rem" }[config.radius];

  return (
    <div className="flex gap-3">
      {/* Light preview */}
      <div
        className="flex-1 rounded-lg border p-3 space-y-2"
        style={{ background: vars.light.background, color: vars.light.foreground, borderColor: vars.light.border }}
      >
        <div className="text-[10px] font-medium opacity-60">Light</div>
        <div className="flex gap-1.5">
          <div className="h-5 flex-1 rounded-sm" style={{ background: vars.light.primary, borderRadius: radius }} />
          <div className="h-5 flex-1 rounded-sm" style={{ background: vars.light.secondary, borderRadius: radius }} />
          <div className="h-5 flex-1 rounded-sm" style={{ background: vars.light.muted, borderRadius: radius }} />
        </div>
        <div className="flex gap-1">
          {[vars.light["chart-1"], vars.light["chart-2"], vars.light["chart-3"], vars.light["chart-4"], vars.light["chart-5"]].map((c, i) => (
            <div key={i} className="h-3 flex-1 rounded-xs" style={{ background: c }} />
          ))}
        </div>
      </div>
      {/* Dark preview */}
      <div
        className="flex-1 rounded-lg border p-3 space-y-2"
        style={{ background: vars.dark.background, color: vars.dark.foreground, borderColor: vars.dark.border }}
      >
        <div className="text-[10px] font-medium opacity-60">Dark</div>
        <div className="flex gap-1.5">
          <div className="h-5 flex-1 rounded-sm" style={{ background: vars.dark.primary, borderRadius: radius }} />
          <div className="h-5 flex-1 rounded-sm" style={{ background: vars.dark.secondary, borderRadius: radius }} />
          <div className="h-5 flex-1 rounded-sm" style={{ background: vars.dark.muted, borderRadius: radius }} />
        </div>
        <div className="flex gap-1">
          {[vars.dark["chart-1"], vars.dark["chart-2"], vars.dark["chart-3"], vars.dark["chart-4"], vars.dark["chart-5"]].map((c, i) => (
            <div key={i} className="h-3 flex-1 rounded-xs" style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ThemeConfigForm({
  config,
  onChange,
  t,
}: {
  config: ThemeConfigBase;
  onChange: (config: ThemeConfigBase) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>{t("adminTheme.style")}</Label>
        <Select value={config.style} onValueChange={(v) => { if (v) onChange({ ...config, style: v as ThemeStyle }); }}>
          <SelectTrigger className="w-full">
            {t(`adminTheme.styles.${config.style}`)}
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {THEME_STYLES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`adminTheme.styles.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{t("adminTheme.baseColor")}</Label>
        <Select value={config.base_color} onValueChange={(v) => { if (v) onChange({ ...config, base_color: v as ThemeBaseColor }); }}>
          <SelectTrigger className="w-full">
            <ColorLabel color={config.base_color} t={t} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {THEME_BASE_COLORS.map((c) => (
              <SelectItem key={c} value={c}>
                <ColorLabel color={c} t={t} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{t("adminTheme.themeColor")}</Label>
        <Select value={config.theme_color} onValueChange={(v) => { if (v) onChange({ ...config, theme_color: v as ThemeColor }); }}>
          <SelectTrigger className="w-full">
            <ColorLabel color={config.theme_color} t={t} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {THEME_COLORS.map((c) => (
              <SelectItem key={c} value={c}>
                <ColorLabel color={c} t={t} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{t("adminTheme.chartColor")}</Label>
        <Select value={config.chart_color} onValueChange={(v) => { if (v) onChange({ ...config, chart_color: v as ThemeColor }); }}>
          <SelectTrigger className="w-full">
            <ColorLabel color={config.chart_color} t={t} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {THEME_COLORS.map((c) => (
              <SelectItem key={c} value={c}>
                <ColorLabel color={c} t={t} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{t("adminTheme.radius")}</Label>
        <Select value={config.radius} onValueChange={(v) => { if (v) onChange({ ...config, radius: v as ThemeRadius }); }}>
          <SelectTrigger className="w-full">
            {t(`adminTheme.radii.${config.radius}`)}
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {THEME_RADII.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`adminTheme.radii.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{t("adminTheme.preview")}</Label>
        <ThemePreview config={config} />
      </div>
    </div>
  );
}

export default function ThemeSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminThemes(),
    queryFn: () => adminTheme.list(),
  });

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<ThemePresetResponse | null>(null);
  const [formName, setFormName] = useState("");
  const [formConfig, setFormConfig] = useState<ThemeConfigBase>(DEFAULT_CONFIG);
  const [deleteTarget, setDeleteTarget] = useState<ThemePresetResponse | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.adminThemes() });

  const createMutation = useMutation({
    mutationFn: () => adminTheme.create({ name: formName, config: formConfig }),
    onSuccess: () => {
      toast.success(t("adminTheme.createSuccess"));
      setDialogMode(null);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editTarget) throw new Error("no target");
      return adminTheme.update(editTarget.id, { name: formName, config: formConfig });
    },
    onSuccess: () => {
      toast.success(t("adminTheme.updateSuccess"));
      setDialogMode(null);
      setEditTarget(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminTheme.delete(id),
    onSuccess: () => {
      toast.success(t("adminTheme.deleteSuccess"));
      setDeleteTarget(null);
      invalidate();
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => adminTheme.setDefault(id),
    onSuccess: () => {
      toast.success(t("adminTheme.setDefaultSuccess"));
      invalidate();
    },
  });

  const openCreate = () => {
    setFormName("");
    setFormConfig(DEFAULT_CONFIG);
    setEditTarget(null);
    setDialogMode("create");
  };

  const openEdit = (preset: ThemePresetResponse) => {
    setFormName(preset.name);
    setFormConfig(preset.config);
    setEditTarget(preset);
    setDialogMode("edit");
  };

  const handleSubmit = () => {
    if (dialogMode === "create") createMutation.mutate();
    else updateMutation.mutate();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const themes = data?.themes ?? [];

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("adminTheme.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("adminTheme.desc")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          {t("adminTheme.create")}
        </Button>
      </div>

      {themes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("adminTheme.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {themes.map((preset) => (
            <Card key={preset.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{preset.name}</CardTitle>
                    {preset.is_default && (
                      <Badge variant="secondary">
                        <Star className="mr-1 size-3" />
                        {t("adminTheme.default")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!preset.is_default && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => defaultMutation.mutate(preset.id)}
                        disabled={defaultMutation.isPending}
                        title={t("adminTheme.setDefault")}
                      >
                        <Star className="size-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(preset)} title={t("common.edit")}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(preset)} title={t("common.delete")}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {t(`adminTheme.styles.${preset.config.style}`)} · {t(`adminTheme.colors.${preset.config.base_color}`)} · {t(`adminTheme.colors.${preset.config.theme_color}`)} · {t(`adminTheme.radii.${preset.config.radius}`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ThemePreview config={preset.config} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(v) => { if (!v) { setDialogMode(null); setEditTarget(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? t("adminTheme.create") : t("adminTheme.edit")}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create" ? t("adminTheme.createDesc") : t("adminTheme.editDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label>{t("adminTheme.name")}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("adminTheme.namePlaceholder")}
              />
            </div>
            <ThemeConfigForm config={formConfig} onChange={setFormConfig} t={t} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogMode(null); setEditTarget(null); }} disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || !formName.trim()}>
              {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminTheme.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("adminTheme.deleteConfirm", { name: deleteTarget?.name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
