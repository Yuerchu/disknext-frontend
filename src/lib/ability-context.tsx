import { createContext, useContext, useMemo } from "react";
import { createContextualCan } from "@casl/react";
import { type AppAbility, buildAbility, emptyAbility } from "./ability";
import { useUserStore } from "@/stores/user";

const AbilityContext = createContext<AppAbility>(emptyAbility());

export const Can = createContextualCan(AbilityContext.Consumer);

export function useAbility(): AppAbility {
  return useContext(AbilityContext);
}

export function AbilityProvider({ children }: { children: React.ReactNode }) {
  const profile = useUserStore((s) => s.profile);

  const ability = useMemo(() => {
    if (!profile) return emptyAbility();
    // 合并：用户组 scopes + 用户 scopes（去重）
    const merged = [...new Set([
      ...(profile.group?.scopes ?? []),
      ...(profile.scopes ?? []),
    ])];
    if (merged.length === 0) return emptyAbility();
    return buildAbility(merged);
  }, [profile]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
