import Link from "next/link";

const navItems = [
  { href: "/app", label: "Dashboard" },
  { href: "#", label: "Hikayeler" },
  { href: "#", label: "Gelisim" },
  { href: "/app/profiles", label: "Profiller" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant/80 bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-18 w-full max-w-[1180px] items-center justify-between px-6">
        <Link
          className="text-[2rem] font-extrabold tracking-tight text-on-surface"
          href="/"
        >
          LUMI
        </Link>

        <nav
          className="hidden items-center gap-2 md:flex"
          aria-label="Ana gezinme"
        >
          {navItems.map((item) => (
            <Link
              key={item.label}
              className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            type="button"
            aria-label="Bildirimler"
          >
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            type="button"
            aria-label="Ayarlar"
          >
            <span className="material-symbols-outlined text-[20px]">
              settings
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
