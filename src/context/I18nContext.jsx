import { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "../i18n/en.json";
import fr from "../i18n/fr.json";

const translations = { en, fr };

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    var stored = localStorage.getItem("dp-language");
    return stored && translations[stored] ? stored : "en";
  });

  useEffect(() => {
    localStorage.setItem("dp-language", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key) => {
    const dict = translations[locale] || translations.en;
    return dict[key] || translations.en[key] || key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside I18nProvider");
  return ctx;
}
