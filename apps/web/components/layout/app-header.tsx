import Link from "next/link";

const navItems = [
  { href: "/app", label: "Ana Sayfa" },
  { href: "/app/profiles", label: "Çocuklarım" },
  { href: "/app/settings/safety", label: "Güvenlik" },
];

export function AppHeader() {
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
              YAŞAYAN HİKÂYELER
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-outline-variant/70 bg-white/60 p-1 md:flex"
          aria-label="Ana gezinme"
        >
          {navItems.map((item) => (
            <Link
              key={item.label}
              className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-white hover:text-on-surface"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            className="hidden rounded-full border border-outline-variant/70 bg-white/65 px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-white sm:inline-flex"
            href="/login"
          >
            Hikâyeme dön
          </Link>
          <Link
            className="grid h-10 w-10 place-items-center rounded-full border border-outline-variant/70 bg-white/65 text-on-surface-variant transition-colors hover:bg-white hover:text-on-surface"
            href="/app/settings"
            aria-label="Ayarlar"
          >
            <span className="material-symbols-outlined text-[20px]">
              settings
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
