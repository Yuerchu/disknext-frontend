import { useParams } from "react-router";
import { useTranslation } from "react-i18next";

const categoryKeys: Record<string, string> = {
  image: "nav.images",
  video: "nav.videos",
  audio: "nav.music",
  document: "nav.documents",
};

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const { t } = useTranslation();
  const titleKey = categoryKeys[category ?? ""] ?? "nav.myFiles";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
    </div>
  );
}
