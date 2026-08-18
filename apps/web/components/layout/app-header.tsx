import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

export async function AppHeader() {
  const t = await getTranslations("header");
  const common = await getTranslations("common");
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  const navItems = [
    { href: "/app", label: t("home") },
    { href: "/app/profiles", label: t("children") },
    { href: "/app/assets", label: t("assets") },
    { href: "/app/settings/safety", label: t("safety") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant/60 bg-[#fffaf0]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-3 md:px-6">
        <Link className="group flex items-center gap-3" href="/">
          <span className="grid h-10 w-10 place-items-center rounded-[1rem] bg-primary-container text-primary shadow-sm transition-transform group-hover:-rotate-3">
            <span className="material-symbols-outlined" aria-hidden="true">
              auto_stories
            </span>
          </span>
          <span>
            <span className="block text-lg font-extrabold tracking-tight text-on-surface">
              LUMI
            </span>
            <span className="hidden text-[11px] font-bold tracking-[0.08em] text-on-surface-variant sm:block">
              {t("tagline")}
            </span>
          </span>
        </Link>

        {parent ? (
          <nav
            className="hidden items-center gap-1 rounded-full border border-outline-variant/70 bg-white/60 p-1 md:flex"
            aria-label={t("navigationLabel")}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-white hover:text-on-surface"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {parent ? (
            <>
              <Link
                className="grid h-10 w-10 place-items-center rounded-full border border-outline-variant/70 bg-white/65 text-on-surface-variant transition-colors hover:bg-white hover:text-on-surface"
                href="/app/settings"
                aria-label={common("settings")}
              >
                <span className="material-symbols-outlined text-[20px]">
                  settings
                </span>
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full border border-outline-variant/70 bg-white/65 text-on-surface-variant transition-colors hover:bg-white hover:text-on-surface"
                  type="submit"
                  aria-label={common("logout")}
                  title={common("logout")}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    logout
                  </span>
                </button>
              </form>
            </>
          ) : (
            <Link
              className="hidden rounded-full border border-outline-variant/70 bg-white/65 px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-white sm:inline-flex"
              href="/login"
            >
              {t("returnToStory")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
