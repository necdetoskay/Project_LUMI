import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { resolveUiLocale, uiLocaleCookieName } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveUiLocale(cookieStore.get(uiLocaleCookieName)?.value);
  const [messages, stories] = await Promise.all([
    import(`../messages/${locale}.json`).then((module) => module.default),
    import(`../messages/stories/${locale}.json`).then(
      (module) => module.default,
    ),
  ]);

  return {
    locale,
    messages: {
      ...messages,
      stories,
    },
  };
});
