import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useRequireGuest } from "@/hooks/use-auth";

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useRequireGuest();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
          D
        </div>
        <h1 className="text-4xl font-bold">DiskNext</h1>
      </div>
      <p className="text-muted-foreground text-lg">
        Your personal cloud storage
      </p>
      <div className="flex gap-3">
        <Button size="lg" onClick={() => navigate("/session")}>
          {t("auth.login")}
        </Button>
      </div>
    </div>
  );
}
