export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-outline-variant/80 bg-white">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold tracking-[0.08em] text-on-surface">
            LUMI
          </span>
          <p className="text-sm text-on-surface-variant">
            Project LUMI Foundation
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-on-surface-variant">
          <a className="transition-colors hover:text-on-surface" href="#">
            Gizlilik Politikasi
          </a>
          <a className="transition-colors hover:text-on-surface" href="#">
            Kullanim Sartlari
          </a>
          <a className="transition-colors hover:text-on-surface" href="#">
            Yardim Merkezi
          </a>
        </div>
      </div>
    </footer>
  );
}
