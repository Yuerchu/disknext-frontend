import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import zhCN from "./zh-CN.json";
import en from "./en.json";
import zhTW from "./zh-TW.json";

function detectLocale(): string {
  const stored = localStorage.getItem("locale");
  if (stored && ["zh-CN", "en", "zh-TW"].includes(stored)) return stored;

  const lang = navigator.language;
  if (lang.startsWith("zh")) {
    if (lang === "zh-TW" || lang === "zh-HK") return "zh-TW";
    return "zh-CN";
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
    "zh-TW": { translation: zhTW },
  },
  lng: detectLocale(),
  fallbackLng: "zh-CN",
  interpolation: { escapeValue: false },
});

export function setLocale(locale: string) {
  i18n.changeLanguage(locale);
  localStorage.setItem("locale", locale);
}

export default i18n;
