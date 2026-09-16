import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ta from "./locales/ta.json";
import te from "./locales/te.json";
import kn from "./locales/kn.json";
import or from "./locales/or.json";

const savedLang =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window.localStorage.getItem("shrimpguard-lang") || "en"
    : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ta: { translation: ta },
    te: { translation: te },
    kn: { translation: kn },
    or: { translation: or },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;