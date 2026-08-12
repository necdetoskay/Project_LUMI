"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { newIdempotencyKey } from "@/lib/new-id";

type VisualCandidate = {
  id: string;
  lifecycleState: "candidate" | "canonical" | "rejected" | "archived";
  provider: string | null;
  model: string | null;
  candidateIndex: number;
  createdAt: string;
  assetKind?: string;
  sourceCompositeAssetId?: string | null;
};

type VisualCanon = {
  selectedAssetId: string | null;
  version: number;
  selectedAt: string | null;
} | null;

type LibraryResponse = {
  canon: VisualCanon;
  candidates: VisualCandidate[];
  variants: VisualCandidate[];
};

export function CharacterVisualManager({
  householdId,
  characterId,
  characterName,
}: {
  householdId: string;
  characterId: string;
  characterName: string;
}) {
  const [state, setState] = useState<LibraryResponse>({
    canon: null,
    candidates: [],
    variants: [],
  });
  const [candidateCount, setCandidateCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const endpoint = `/api/assets/characters/${encodeURIComponent(characterId)}?householdId=${encodeURIComponent(householdId)}`;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = (await response.json()) as LibraryResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Karakter görselleri yüklenemedi.");
      }
      setState({
        canon: payload.canon,
        candidates: payload.candidates ?? [],
        variants: payload.variants ?? [],
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Karakter görselleri yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canonicalCandidate = useMemo(
    () =>
      state.candidates.find(
        (candidate) => candidate.id === state.canon?.selectedAssetId,
      ) ?? null,
    [state.candidates, state.canon?.selectedAssetId],
  );

  const activeCandidates = state.candidates.filter(
    (candidate) => candidate.lifecycleState !== "rejected",
  );

  async function act(body: Record<string, unknown>, successText: string) {
    setBusy(String(body.action ?? "action"));
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "İşlem tamamlanamadı.");
      }
      await refresh();
      setMessage(successText);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İşlem tamamlanamadı.",
      );
    } finally {
      setBusy(null);
    }
  }

  const contentUrl = (assetId: string) =>
    `/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(assetId)}?householdId=${encodeURIComponent(householdId)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            Karakter görselleri
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
            Görsel kimlik
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Canonical görünümü seç, yeni adaylar üret ve aynı karakter kimliğini
            koruyarak sonraki outfit ve stil varyantlarını yönet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-extrabold text-on-surface-variant">
            Aday
            <select
              className="ml-2 rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-bold text-on-surface"
              disabled={busy === "generate"}
              onChange={(event) =>
                setCandidateCount(Number(event.target.value))
              }
              value={candidateCount}
            >
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <button
            className="storybook-button"
            disabled={busy === "generate"}
            onClick={() =>
              void act(
                {
                  action: "generate",
                  idempotencyKey: `visual-${characterId}-${newIdempotencyKey()}`,
                  candidateCount,
                  aspectRatio: "3:2",
                  mode: "reference-sheet",
                },
                `${candidateCount} yeni karakter görseli hazırlandı.`,
              )
            }
            type="button"
          >
            {busy === "generate" ? "Üretiliyor…" : "Yeni aday üret"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface-variant">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
                Aktif görünüm
              </p>
              <p className="mt-1 font-extrabold text-on-surface">
                {canonicalCandidate
                  ? `${characterName} canonical`
                  : "Henüz seçilmedi"}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-on-surface-variant">
              v{state.canon?.version ?? 0}
            </span>
          </div>

          <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-2xl border border-outline-variant bg-white">
            {canonicalCandidate ? (
              <Image
                alt={`${characterName} canonical karakter görseli`}
                className="object-contain p-3"
                fill
                sizes="(min-width: 1024px) 35vw, 100vw"
                src={contentUrl(canonicalCandidate.id)}
                unoptimized
              />
            ) : (
              <div className="grid h-full place-items-center text-center text-on-surface-variant">
                <div>
                  <span className="material-symbols-outlined text-6xl text-primary">
                    person
                  </span>
                  <p className="mt-2 text-sm font-bold">
                    Adaylardan birini canonical olarak seç.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-outline-variant bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
                Üretilmiş adaylar
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Karaktere ait üretilmiş görseller arasından aktif görünümü seç.
              </p>
            </div>
            <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-extrabold text-on-surface-variant">
              {loading ? "…" : activeCandidates.length}
            </span>
          </div>

          {activeCandidates.length === 0 && !loading ? (
            <div className="mt-4 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-primary">
                add_photo_alternate
              </span>
              <p className="mt-2 font-extrabold text-on-surface">
                Henüz karakter görseli yok
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                “Yeni aday üret” ile ilk görsel setini oluşturabilirsin.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {activeCandidates.map((candidate) => {
                const selected = candidate.id === state.canon?.selectedAssetId;
                return (
                  <article
                    className={`overflow-hidden rounded-2xl border bg-white ${selected ? "border-primary ring-2 ring-primary/20" : "border-outline-variant"}`}
                    key={candidate.id}
                  >
                    <div className="relative aspect-square bg-surface-container-low">
                      <Image
                        alt={`${characterName} görsel adayı ${candidate.candidateIndex + 1}`}
                        className="object-contain p-2"
                        fill
                        sizes="220px"
                        src={contentUrl(candidate.id)}
                        unoptimized
                      />
                      {selected ? (
                        <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-black text-on-primary">
                          CANON
                        </span>
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs font-bold text-on-surface-variant">
                        {candidate.model ??
                          candidate.provider ??
                          "Görsel adayı"}
                      </p>
                      <button
                        className="storybook-button-secondary mt-2 w-full text-xs"
                        disabled={selected || busy === "select"}
                        onClick={() =>
                          void act(
                            { action: "select", assetId: candidate.id },
                            "Canonical karakter görseli güncellendi.",
                          )
                        }
                        type="button"
                      >
                        {selected ? "Aktif görünüm" : "Canonical seç"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-outline-variant bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              Görünüm varyantları
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Referans sheet'ten türetilen canon açılar burada korunur; outfit
              ve hikâye varyantları sonraki adımda aynı alana eklenecek.
            </p>
          </div>
          <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-extrabold text-on-surface-variant">
            {state.variants.length}
          </span>
        </div>

        {state.variants.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
            {state.variants.map((variant) => (
              <div
                className="relative aspect-square overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"
                key={variant.id}
              >
                <Image
                  alt={`${characterName} görünüm varyantı`}
                  className="object-contain p-1"
                  fill
                  sizes="120px"
                  src={contentUrl(variant.id)}
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
