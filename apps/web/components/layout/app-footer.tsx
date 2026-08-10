import Link from "next/link";
import { useTranslations } from "next-intl";

export function AppFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-outline-variant/60 bg-[#fffaf0]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-container text-primary">
            <span
              className="material-symbols-outlined text-[19px]"
              aria-hidden="true"
            >
              auto_stories
            </span>
          </span>
          <div>
            <span className="block text-sm font-extrabold tracking-[0.08em] text-on-surface">
              LUMI
            </span>
            <p className="m-0 text-sm text-on-surface-variant">
              {t("tagline")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-on-surface-variant">
          <Link className="transition-colors hover:text-on-surface" href="/">
            {t("about")}
          </Link>
          <a className="transition-colors hover:text-on-surface" href="#">
            {t("privacy")}
          </a>
          <a className="transition-colors hover:text-on-surface" href="#">
            {t("help")}
          </a>
        </div>
      </div>
    </footer>
  );
}
