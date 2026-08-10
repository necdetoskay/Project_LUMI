import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { resolveUiLocale, uiLocaleCookieName } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveUiLocale(cookieStore.get(uiLocaleCookieName)?.value);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
