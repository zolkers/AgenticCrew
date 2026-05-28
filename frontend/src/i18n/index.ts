import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import fr from "./fr.json";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  },
  lng: "en",
  resources: {
    en: { translation: en },
    fr: { translation: fr }
  }
});
