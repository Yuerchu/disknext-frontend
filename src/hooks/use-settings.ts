import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { resolveErrorMessage } from "@/api";

interface SettingsApi<T> {
  get: () => Promise<T>;
  update: (data: Partial<T>) => Promise<unknown>;
}

export function useSettings<T>(api: SettingsApi<T>, successMessage: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get();
      setData(result);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (updates: Partial<T>) => {
    setSaving(true);
    try {
      await api.update(updates);
      setData((prev) => prev ? { ...prev, ...updates } : prev);
      toast.success(successMessage);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [api, successMessage]);

  const update = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setData((prev) => prev ? { ...prev, [key]: value } : prev);
  }, []);

  return { data, loading, saving, save, update, reload: load };
}
