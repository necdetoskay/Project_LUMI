import type { ReactNode } from "react";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      {children}
    </section>
  );
}
