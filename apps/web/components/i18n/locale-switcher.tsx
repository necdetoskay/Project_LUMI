"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import {
  supportedLocales,
  type UiLocale,
  uiLocaleCookieName,
} from "@/i18n/config";

const localeLabels: Record<UiLocale, "turkish" | "english"> = {
  tr: "turkish",
  en: "english",
};

export function LocaleSwitcher() {
  const currentLocale = useLocale() as UiLocale;
  const t = useTranslations("common");
  const router = useRouter();

  function setLocale(locale: UiLocale) {
    if (locale === currentLocale) return;

    document.cookie = `${uiLocaleCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
      <span className="sr-only">{t("language")}</span>
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        language
      </span>
      <select
        className="rounded-full border border-outline-variant/70 bg-white/65 px-3 py-2 text-sm font-bold text-on-surface outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label={t("language")}
        value={currentLocale}
        onChange={(event) => setLocale(event.target.value as UiLocale)}
      >
        {supportedLocales.map((locale) => (
          <option key={locale} value={locale}>
            {t(localeLabels[locale])}
          </option>
        ))}
      </select>
    </label>
  );
}
