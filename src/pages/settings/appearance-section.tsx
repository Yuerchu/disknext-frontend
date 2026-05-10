import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { site, userSettings } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { useTheme } from "@/hooks/use-theme";
import {
  THEME_BASE_COLORS, THEME_COLORS, THEME_RADII, THEME_STYLES,
  applyThemeConfig, clearThemeConfig, resolveThemeCssVars,
} from "@/lib/theme-registry";
import type { ThemeConfigBase, ThemeBaseColor, ThemeColor, ThemeRadius, ThemeStyle } from "@/api/types";

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

export default function AppearanceSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { theme: darkMode, setTheme: setDarkMode } = useTheme();

  const settingsQuery = useQuery({ queryKey: queryKeys.userSettings(), queryFn: userSettings.get });
  const themesQuery = useQuery({ queryKey: queryKeys.siteThemes(), queryFn: site.themes });

  const presets = themesQuery.data?.themes ?? [];
  const settings = settingsQuery.data;

  const [selectedPresetId, setSelectedPresetId] = useState<string | null | undefined>(undefined);
  const [customConfig, setCustomConfig] = useState<ThemeConfigBase | null | undefined>(undefined);

  if (settings && selectedPresetId === undefined) {
    setSelectedPresetId(settings.theme_preset_id);
  }
  if (settings && customConfig === undefined) {
    setCustomConfig(settings.theme_config);
  }

  const activePreset = presets.find((p) => p.id === selectedPresetId);
  const activeConfig = customConfig ?? activePreset?.config ?? null;

  const handlePresetChange = (presetId: string) => {
    if (presetId === "__none__") {
      setSelectedPresetId(null);
      setCustomConfig(null);
      clearThemeConfig();
      return;
    }
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(preset.id);
      setCustomConfig(preset.config);
      applyThemeConfig(preset.config.base_color, preset.config.theme_color, preset.config.chart_color, preset.config.radius);
    }
  };

  const handleConfigChange = (config: ThemeConfigBase) => {
    setCustomConfig(config);
    applyThemeConfig(config.base_color, config.theme_color, config.chart_color, config.radius);
  };

  const handleReset = () => {
    const defaultPreset = presets.find((p) => p.is_default);
    if (defaultPreset) {
      setSelectedPresetId(defaultPreset.id);
      setCustomConfig(defaultPreset.config);
      applyThemeConfig(defaultPreset.config.base_color, defaultPreset.config.theme_color, defaultPreset.config.chart_color, defaultPreset.config.radius);
    } else {
      setSelectedPresetId(null);
      setCustomConfig(null);
      clearThemeConfig();
    }
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!settings) throw new Error("no settings");
      return userSettings.update({
        language: settings.language,
        timezone: settings.timezone,
        theme_preset_id: selectedPresetId ?? null,
        theme_config: customConfig ?? null,
      });
    },
    onSuccess: () => {
      toast.success(t("userSettings.saveSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.userSettings() });
    },
  });

  if (settingsQuery.isLoading || themesQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Dark mode */}
      <Card>
        <CardHeader>
          <CardTitle>{t("userSettings.appearance.darkMode")}</CardTitle>
          <CardDescription>{t("userSettings.appearance.darkModeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={darkMode} onValueChange={(v) => { if (v) setDarkMode(v as "light" | "dark" | "system"); }}>
            <SelectTrigger className="w-48">
              {t(`theme.${darkMode}`)}
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="light">{t("theme.light")}</SelectItem>
              <SelectItem value="dark">{t("theme.dark")}</SelectItem>
              <SelectItem value="system">{t("theme.system")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Theme preset */}
      {presets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("userSettings.appearance.presetTitle")}</CardTitle>
            <CardDescription>{t("userSettings.appearance.presetDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {presets.map((preset) => {
                const isActive = selectedPresetId === preset.id;
                const vars = resolveThemeCssVars(preset.config.base_color, preset.config.theme_color, preset.config.chart_color, preset.config.radius);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${isActive ? "border-primary" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <div className="text-sm font-medium mb-2">{preset.name}</div>
                    <div className="flex gap-1">
                      {[vars.light.primary, vars.light["chart-1"], vars.light["chart-2"], vars.light["chart-3"], vars.light["chart-4"]].map((c, i) => (
                        <div key={i} className="h-4 flex-1 rounded-xs" style={{ background: c }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom theme config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("userSettings.appearance.customTitle")}</CardTitle>
              <CardDescription>{t("userSettings.appearance.customDesc")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-2 size-4" />
              {t("common.reset")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {activeConfig && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t("adminTheme.style")}</Label>
                  <Select value={activeConfig.style} onValueChange={(v) => { if (v) handleConfigChange({ ...activeConfig, style: v as ThemeStyle }); }}>
                    <SelectTrigger className="w-full">
                      {t(`adminTheme.styles.${activeConfig.style}`)}
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {THEME_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>{t(`adminTheme.styles.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("adminTheme.radius")}</Label>
                  <Select value={activeConfig.radius} onValueChange={(v) => { if (v) handleConfigChange({ ...activeConfig, radius: v as ThemeRadius }); }}>
                    <SelectTrigger className="w-full">
                      {t(`adminTheme.radii.${activeConfig.radius}`)}
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {THEME_RADII.map((r) => (
                        <SelectItem key={r} value={r}>{t(`adminTheme.radii.${r}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>{t("adminTheme.baseColor")}</Label>
                  <Select value={activeConfig.base_color} onValueChange={(v) => { if (v) handleConfigChange({ ...activeConfig, base_color: v as ThemeBaseColor }); }}>
                    <SelectTrigger className="w-full">
                      <ColorLabel color={activeConfig.base_color} t={t} />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {THEME_BASE_COLORS.map((c) => (
                        <SelectItem key={c} value={c}><ColorLabel color={c} t={t} /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("adminTheme.themeColor")}</Label>
                  <Select value={activeConfig.theme_color} onValueChange={(v) => { if (v) handleConfigChange({ ...activeConfig, theme_color: v as ThemeColor }); }}>
                    <SelectTrigger className="w-full">
                      <ColorLabel color={activeConfig.theme_color} t={t} />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {THEME_COLORS.map((c) => (
                        <SelectItem key={c} value={c}><ColorLabel color={c} t={t} /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("adminTheme.chartColor")}</Label>
                  <Select value={activeConfig.chart_color} onValueChange={(v) => { if (v) handleConfigChange({ ...activeConfig, chart_color: v as ThemeColor }); }}>
                    <SelectTrigger className="w-full">
                      <ColorLabel color={activeConfig.chart_color} t={t} />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {THEME_COLORS.map((c) => (
                        <SelectItem key={c} value={c}><ColorLabel color={c} t={t} /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          {!activeConfig && (
            <p className="text-sm text-muted-foreground">{t("userSettings.appearance.noConfig")}</p>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
