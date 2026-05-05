import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight } from "lucide-react";
import { adminScope } from "@/api";
import type { ScopeMetadataResponse, ScopeResource } from "@/api";

interface ScopePickerProps {
  value: string[];
  onChange: (scopes: string[]) => void;
}

export function ScopePicker({ value, onChange }: ScopePickerProps) {
  const { t } = useTranslation();
  const [metadata, setMetadata] = useState<ScopeMetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    adminScope.metadata().then((data) => {
      setMetadata(data);
      const parentResources = new Set<string>();
      for (const r of data.resources) {
        if (r.parent) parentResources.add(r.parent);
      }
      setCollapsed(parentResources);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !metadata) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const { actions } = metadata;
  const selected = new Set(value);

  const toggle = (resource: ScopeResource, action: string, visibility: string) => {
    const scope = findScope(resource, action, visibility);
    if (!scope) return;
    const next = new Set(selected);

    if (next.has(scope.value)) {
      // Unchecking
      next.delete(scope.value);
      if (visibility === "own") {
        // Uncheck own → also uncheck all
        const allScope = findScope(resource, action, "all");
        if (allScope) next.delete(allScope.value);
      }
    } else {
      // Checking
      next.add(scope.value);
      if (visibility === "all") {
        // Check all → also check own
        const ownScope = findScope(resource, action, "own");
        if (ownScope) next.add(ownScope.value);
      }
    }
    onChange([...next]);
  };

  const toggleWildcard = (resource: ScopeResource) => {
    const wildcard = resource.scopes.find((s) => s.action === "*");
    if (!wildcard) return;
    const next = new Set(selected);
    if (next.has(wildcard.value)) {
      for (const s of resource.scopes) next.delete(s.value);
    } else {
      for (const s of resource.scopes) next.delete(s.value);
      next.add(wildcard.value);
    }
    onChange([...next]);
  };

  const isWildcard = (resource: ScopeResource) => {
    const wc = resource.scopes.find((s) => s.action === "*");
    return wc ? selected.has(wc.value) : false;
  };

  const findScope = (resource: ScopeResource, action: string, visibility: string) =>
    resource.scopes.find((s) => s.action === action && s.visibility === visibility);

  const toggleCollapse = (resource: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  };

  const topLevel = metadata.resources.filter((r) => !r.parent);
  const childrenOf = (parent: string) =>
    metadata.resources.filter((r) => r.parent === parent);
  const hasChildren = (resource: string) =>
    metadata.resources.some((r) => r.parent === resource);

  const renderRow = (resource: ScopeResource, indent: boolean = false) => {
    const wc = isWildcard(resource);
    const isParent = hasChildren(resource.resource);
    const isCollapsed = collapsed.has(resource.resource);

    return (
      <tr key={resource.resource} className="border-b border-border/50 last:border-b-0">
        {/* Resource name */}
        <td className={`py-2 pr-3 text-sm font-medium whitespace-nowrap ${indent ? "pl-8" : "pl-2"}`}>
          <div className="flex items-center gap-1.5">
            {isParent ? (
              <button
                className="flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => toggleCollapse(resource.resource)}
              >
                {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            ) : indent ? (
              <span className="size-5" />
            ) : null}
            <span>{t(`scope.resource.${resource.resource}`, { defaultValue: resource.resource })}</span>
          </div>
        </td>
        {/* Wildcard (All) */}
        <td className="px-2 py-2 text-center">
          <Checkbox checked={wc} onCheckedChange={() => toggleWildcard(resource)} />
        </td>
        {/* Action columns: own | all */}
        {actions.map((action) => {
          const ownScope = findScope(resource, action, "own");
          const allScope = findScope(resource, action, "all");
          return (
            <td key={action} className="py-2 text-center" colSpan={2}>
              <div className="flex items-center justify-center gap-3">
                {ownScope && (
                  <Checkbox
                    checked={wc || selected.has(ownScope.value)}
                    disabled={wc}
                    onCheckedChange={() => toggle(resource, action, "own")}
                  />
                )}
                {allScope && (
                  <Checkbox
                    checked={wc || selected.has(allScope.value)}
                    disabled={wc}
                    onCheckedChange={() => toggle(resource, action, "all")}
                  />
                )}
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  const renderResourceRows = (resource: ScopeResource, indent: boolean = false): React.ReactNode[] => {
    const rows: React.ReactNode[] = [renderRow(resource, indent)];
    const isParent = hasChildren(resource.resource);
    if (isParent && !collapsed.has(resource.resource)) {
      for (const child of childrenOf(resource.resource)) {
        rows.push(...renderResourceRows(child, true));
      }
    }
    return rows;
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="py-2 pl-2 pr-3 text-left font-medium" rowSpan={2}>
              {t(`scope.resource.files`, { defaultValue: "" }).length > 0 ? "" : ""}
            </th>
            <th className="px-2 py-1 text-center font-medium text-xs" rowSpan={2}>
              {t("scope.action.*")}
            </th>
            {actions.map((action) => (
              <th key={action} className="px-2 py-1 text-center font-medium text-xs" colSpan={2}>
                {t(`scope.action.${action}`, { defaultValue: action })}
              </th>
            ))}
          </tr>
          <tr className="border-b bg-muted/30">
            {actions.map((action) => (
              <td key={action} className="py-1 text-center" colSpan={2}>
                <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
                  <span>{t("scope.visibility.own")}</span>
                  <span>{t("scope.visibility.all")}</span>
                </div>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {topLevel.flatMap((resource) => renderResourceRows(resource))}
        </tbody>
      </table>
    </div>
  );
}
