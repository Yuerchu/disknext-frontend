import { RouterProvider } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AbilityProvider } from "@/lib/ability-context";
import { router } from "@/router";

export function App() {
  return (
    <AbilityProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </AbilityProvider>
  );
}
