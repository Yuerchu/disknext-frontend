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
  const scopes = profile?.scopes;

  const ability = useMemo(() => {
    if (!scopes || scopes.length === 0) return emptyAbility();
    return buildAbility(scopes);
  }, [scopes]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
