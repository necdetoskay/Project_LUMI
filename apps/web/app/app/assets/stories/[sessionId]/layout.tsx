import type { ReactNode } from "react";

import { StoryVisualActions } from "./story-visual-actions";

export default async function StoryVisualWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <>
      {children}
      <aside className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-outline-variant/70 bg-surface/95 p-3 shadow-xl backdrop-blur md:inset-x-auto md:bottom-5 md:right-5 md:w-[360px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              Görsel işlemleri
            </p>
            <p className="text-xs font-bold text-on-surface-variant">
              Eksikleri üret veya hikâye stilini değiştir.
            </p>
          </div>
          <span className="material-symbols-outlined text-primary">
            palette
          </span>
        </div>
        <StoryVisualActions sessionId={sessionId} />
      </aside>
    </>
  );
}
