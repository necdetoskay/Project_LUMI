import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";

import "./globals.css";
import "./storybook.css";

export const metadata: Metadata = {
  title: "Project LUMI",
  description: "Yaşayan, etkileşimli çocuk hikayeleri için LUMI platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <a className="skip-link" href="#main-content">
          Ana içeriğe geç
        </a>
        <AppHeader />
        <main id="main-content" className="flex-1 flex flex-col">
          {children}
        </main>
        <AppFooter />
      </body>
    </html>
  );
}
