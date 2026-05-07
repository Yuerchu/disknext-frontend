import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

interface SettingsApi<T> {
  get: () => Promise<T>;
  update: (data: Partial<T>) => Promise<unknown>;
}

export function useAdminSettings<T>(
  section: string,
  api: SettingsApi<T>,
  successMessage: string,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.adminSettings(section),
    queryFn: api.get,
  });

  const [localData, setLocalData] = useState<T | null>(null);
  const data = localData ?? query.data ?? null;

  const mutation = useMutation({
    mutationFn: (updates: Partial<T>) => api.update(updates),
    onSuccess: () => {
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings(section) });
    },
  });

  const save = useCallback(
    (updates: Partial<T>) => mutation.mutate(updates),
    [mutation],
  );

  const update = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setLocalData((prev) => {
      const base = prev ?? query.data ?? null;
      return base ? { ...base, [key]: value } : null;
    });
  }, [query.data]);

  return {
    data,
    loading: query.isLoading,
    saving: mutation.isPending,
    save,
    update,
    reload: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings(section) }),
  };
}
