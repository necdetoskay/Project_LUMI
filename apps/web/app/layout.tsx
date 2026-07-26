import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "Project LUMI",
  description: "Yaşayan, etkileşimli çocuk hikâyeleri için LUMI platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <a className="skip-link" href="#main-content">
          Ana içeriğe geç
        </a>
        <AppHeader />
        <main id="main-content">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
