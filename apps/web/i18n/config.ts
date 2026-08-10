export const supportedLocales = ["tr", "en"] as const;

export type UiLocale = (typeof supportedLocales)[number];

export const defaultLocale: UiLocale = "tr";
export const uiLocaleCookieName = "lumi-ui-locale";

export function isUiLocale(value: string | undefined): value is UiLocale {
  return supportedLocales.includes(value as UiLocale);
}

export function resolveUiLocale(value: string | undefined): UiLocale {
  return isUiLocale(value) ? value : defaultLocale;
}
