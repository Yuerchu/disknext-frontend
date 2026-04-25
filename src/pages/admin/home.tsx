import { useTranslation } from "react-i18next";

export default function AdminHomePage() {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t("admin.home")}</h1>
      <p className="mt-2 text-muted-foreground">Dashboard placeholder</p>
    </div>
  );
}
