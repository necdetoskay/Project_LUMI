"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AdventureHookCandidate,
  AdventureSourceFamily,
} from "@/lib/stories/adventure-presentation";

type NewAdventureSheetProps = {
  childProfileId: string;
  householdId: string;
  open: boolean;
  onClose: () => void;
};

type CandidatesResponse = {
  candidates?: AdventureHookCandidate[];
  message?: string;
};

type StartResponse = {
  sessionId?: string;
  message?: string;
};

const FAMILY_PRESENTATION: Record<
  AdventureSourceFamily,
  { eyebrow: string; icon: string; cta: string }
> = {
  world_event: {
    eyebrow: "Dünyada Bir Şey Oldu",
    icon: "public",
    cta: "Bu izi takip et",
  },
  rumor: {
    eyebrow: "Bir Söylenti Duydun",
    icon: "forum",
    cta: "Söylentinin peşine düş",
  },
  inventory_item: {
    eyebrow: "Çantandaki Bir Eşya",
    icon: "backpack",
    cta: "Eşyanın sırrını keşfet",
  },
  npc_call: {
    eyebrow: "Birinden Gelen Çağrı",
    icon: "waving_hand",
    cta: "Çağrıya cevap ver",
  },
};

export function NewAdventureSheet({
  childProfileId,
  householdId,
  open,
  onClose,
}: NewAdventureSheetProps) {
  const [page, setPage] = useState(0);
  const [candidates, setCandidates] = useState<AdventureHookCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const loadCandidates = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/child-profiles/${encodeURIComponent(childProfileId)}/stories/adventure-candidates?householdId=${encodeURIComponent(householdId)}&page=${nextPage}`,
        );
        const body = (await response.json()) as CandidatesResponse;
        if (!response.ok) {
          setError(
            body.message ?? "Yeni macera fikirleri şu anda yüklenemedi.",
          );
          return;
        }
        setCandidates(body.candidates ?? []);
      } catch {
        setError("Yeni macera fikirleri yüklenirken bir sorun oluştu.");
      } finally {
        setLoading(false);
      }
    },
    [childProfileId, householdId],
  );

  useEffect(() => {
    if (!open) return;
    setPage(0);
    void loadCandidates(0);
  }, [loadCandidates, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const groupedCandidates = useMemo(() => candidates.slice(0, 6), [candidates]);

  async function startAdventure(candidate: AdventureHookCandidate) {
    setStartingId(candidate.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/child-profiles/${encodeURIComponent(childProfileId)}/stories/start-adventure`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            householdId,
            candidateId: candidate.id,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      const body = (await response.json()) as StartResponse;
      if (!response.ok || !body.sessionId) {
        setError(
          body.message ?? "Macera başlatılamadı. Yeniden deneyebilirsin.",
        );
        return;
      }
      window.location.assign(
        `/app/stories/${encodeURIComponent(body.sessionId)}`,
      );
    } catch {
      setError("Macera başlatılırken beklenmeyen bir sorun oluştu.");
    } finally {
      setStartingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]">
      <button
        aria-label="Yeni macera penceresini kapat"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="new-adventure-title"
        aria-modal="true"
        className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-[#fffaf0] shadow-2xl sm:w-[85vw] md:w-[76vw] lg:w-[640px]"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant/60 px-5 py-5 sm:px-7">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              Yeni Bir Macera
            </div>
            <h2
              className="mt-1 text-2xl font-black text-on-surface sm:text-3xl"
              id="new-adventure-title"
            >
              Bugün maceran nereden başlasın?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
              Dünyandaki olaylardan, duyduğun söylentilerden, çantandaki
              eşyalardan ya da tanıdığın birinden gelen çağrıdan birini seç.
            </p>
          </div>
          <button
            aria-label="Kapat"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-error/20 bg-error-container/50 px-4 py-3 text-sm text-on-error-container">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="h-44 animate-pulse rounded-3xl bg-surface-container"
                  key={index}
                />
              ))}
            </div>
          ) : groupedCandidates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {groupedCandidates.map((candidate) => {
                const presentation =
                  FAMILY_PRESENTATION[candidate.sourceFamily];
                const isStarting = startingId === candidate.id;
                return (
                  <article
                    className="flex min-h-52 flex-col rounded-3xl border border-outline-variant/60 bg-white p-5 shadow-sm"
                    key={candidate.id}
                  >
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-primary">
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-lg"
                      >
                        {presentation.icon}
                      </span>
                      {presentation.eyebrow}
                    </div>
                    <h3 className="mt-3 text-lg font-black leading-6 text-on-surface">
                      {candidate.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-on-surface-variant">
                      {candidate.teaser}
                    </p>
                    <button
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-extrabold text-on-primary disabled:opacity-60"
                      disabled={startingId !== null}
                      onClick={() => void startAdventure(candidate)}
                      type="button"
                    >
                      {isStarting ? "Macera hazırlanıyor…" : presentation.cta}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-outline-variant bg-white px-6 py-12 text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-5xl text-primary/60"
              >
                nights_stay
              </span>
              <h3 className="mt-3 text-lg font-black text-on-surface">
                Dünya biraz sessiz görünüyor
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
                Yeni bir fikir bulmak için başka maceralara bakabilirsin.
              </p>
            </div>
          )}
        </div>

        <footer className="border-t border-outline-variant/60 bg-white/80 px-4 py-4 sm:px-6">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary-fixed/45 px-4 text-sm font-extrabold text-primary disabled:opacity-60"
            disabled={loading || startingId !== null}
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              void loadCandidates(nextPage);
            }}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              auto_awesome
            </span>
            Başka maceralar göster
          </button>
        </footer>
      </section>
    </div>
  );
}
