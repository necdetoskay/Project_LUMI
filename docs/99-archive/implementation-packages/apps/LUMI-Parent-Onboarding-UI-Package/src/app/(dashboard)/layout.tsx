import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold">
            LUMI
          </Link>

          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard">Ana Sayfa</Link>
            <Link href="/inventory">Envanter</Link>
            <Link href="/settings">Ayarlar</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
