import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import en from "../i18n/en.json";
import fr from "../i18n/fr.json";
import es from "../i18n/es.json";
import de from "../i18n/de.json";
import pt from "../i18n/pt.json";
import it from "../i18n/it.json";
import nl from "../i18n/nl.json";
import ru from "../i18n/ru.json";
import ja from "../i18n/ja.json";
import ko from "../i18n/ko.json";
import zh from "../i18n/zh.json";
import ar from "../i18n/ar.json";
import hi from "../i18n/hi.json";
import tr from "../i18n/tr.json";
import pl from "../i18n/pl.json";
import ht from "../i18n/ht.json";

const translations = { en, fr, es, de, pt, it, nl, ru, ja, ko, zh, ar, hi, tr, pl, ht };

var RTL_LANGUAGES = ["ar", "he", "fa", "ur"];

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    var stored = localStorage.getItem("dp-language");
    return stored && translations[stored] ? stored : "en";
  });

  // Auto-detect device language on first launch (native only)
  useEffect(function () {
    if (!localStorage.getItem("dp-language") && Capacitor.isNativePlatform()) {
      import("@capacitor/device").then(function (mod) {
        return mod.Device.getLanguageCode();
      }).then(function (result) {
        var lang = result.value.substring(0, 2);
        if (translations[lang]) {
          setLocale(lang);
        }
      }).catch(function () {});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dp-language", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LANGUAGES.indexOf(locale) !== -1 ? "rtl" : "ltr";
  }, [locale]);

  const t = useCallback((key) => {
    const dict = translations[locale] || translations.en;
    return dict[key] || translations.en[key] || key;
  }, [locale]);

  var isRTL = RTL_LANGUAGES.indexOf(locale) !== -1;

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside I18nProvider");
  return ctx;
}
