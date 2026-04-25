import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t("nav.myFiles")}</h1>
      <p className="mt-2 text-muted-foreground">File browser placeholder</p>
    </div>
  );
}
