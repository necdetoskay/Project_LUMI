"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CharacterOption = {
  id: string;
  name: string;
  subtype: string;
  originConcept: string;
};

type VisualCandidate = {
  id: string;
  storageRef: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  lifecycleState: "candidate" | "canonical" | "rejected" | "archived";
  provider: string | null;
  model: string | null;
  candidateIndex: number;
  createdAt: string;
};

type VisualCanon = {
  selectedAssetId: string | null;
  version: number;
  selectedAt: string | null;
} | null;

type LibraryResponse = {
  canon: VisualCanon;
  candidates: VisualCandidate[];
};

export function AssetsClientPage({
  householdId,
  characters,
}: {
  householdId: string | null;
  characters: CharacterOption[];
}) {
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? "");
  const [state, setState] = useState<LibraryResponse>({
    canon: null,
    candidates: [],
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCharacter = useMemo(
    () => characters.find((entry) => entry.id === characterId) ?? null,
    [characterId, characters],
  );

  const endpoint = useMemo(() => {
    if (!householdId || !characterId) return null;
    return `/api/assets/characters/${encodeURIComponent(characterId)}?householdId=${encodeURIComponent(householdId)}`;
  }, [characterId, householdId]);

  const refresh = useCallback(async () => {
    if (!endpoint) return;
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = (await response.json()) as LibraryResponse & {
      error?: string;
    };
    if (!response.ok)
      throw new Error(payload.error ?? "Görsel kütüphanesi okunamadı.");
    setState(payload);
  }, [endpoint]);

  useEffect(() => {
    void refresh().catch((error: unknown) => {
      setMessage(
        error instanceof Error ? error.message : "Görseller yüklenemedi.",
      );
    });
  }, [refresh]);

  async function act(body: Record<string, unknown>) {
    if (!endpoint) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "İşlem tamamlanamadı.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İşlem tamamlanamadı.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!householdId) {
    return (
      <section className="storybook-page min-h-full">
        <div className="mx-auto w-full max-w-[920px] px-5 py-10">
          <div className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-8">
            <h1 className="text-3xl font-extrabold text-on-surface">
              Görsel Kütüphanesi
            </h1>
            <p className="mt-3 text-on-surface-variant">
              Önce aile alanınızı oluşturun; karakter görselleri daha sonra
              burada yönetilecek.
            </p>
            <Link className="storybook-button mt-6" href="/app/onboarding">
              Aile alanını hazırla
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-5 py-8 md:px-6 md:py-10">
        <header className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-7 shadow-sm md:p-9">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Görsel Kütüphanesi
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-on-surface md:text-4xl">
                Karakterlerin görünümünü burada belirleyin
              </h1>
              <p className="mt-3 max-w-[48rem] leading-7 text-on-surface-variant">
                Yeni görseller oluşturabilir, adayları karşılaştırabilir ve
                karakterin hikâyelerde kullanılacak kalıcı görünümünü
                seçebilirsiniz.
              </p>
            </div>
            <Link className="storybook-button-secondary" href="/app">
              Aile evine dön
            </Link>
          </div>
        </header>

        {characters.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-outline-variant bg-white/75 p-8 text-center">
            <h2 className="text-2xl font-extrabold text-on-surface">
              Henüz karakter yok
            </h2>
            <p className="mt-3 text-on-surface-variant">
              Bir çocuk profili için karakter oluşturduğunuzda görsel adayları
              burada görünecek.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-[2rem] border border-outline-variant/70 bg-white/80 p-6 shadow-sm">
              <label
                className="text-sm font-extrabold text-on-surface"
                htmlFor="visual-character"
              >
                Karakter
              </label>
              <select
                id="visual-character"
                className="mt-2 w-full rounded-2xl border border-outline-variant bg-white px-4 py-3 text-on-surface md:max-w-md"
                value={characterId}
                onChange={(event) => setCharacterId(event.target.value)}
              >
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
              {selectedCharacter ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
                  {selectedCharacter.originConcept}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="storybook-button"
                  disabled={busy}
                  onClick={() =>
                    void act({
                      action: "generate",
                      idempotencyKey: `visual-${characterId}-${crypto.randomUUID()}`,
                      candidateCount: 1,
                      aspectRatio: "1:1",
                    })
                  }
                  type="button"
                >
                  {busy ? "Hazırlanıyor…" : "Yeni görsel oluştur"}
                </button>
                <button
                  className="storybook-button-secondary"
                  disabled={busy}
                  onClick={() => void refresh()}
                  type="button"
                >
                  Yenile
                </button>
              </div>
              {message ? (
                <p className="mt-4 rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {message}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="visual-candidates-heading">
              <div className="mb-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                  Görsel adayları
                </p>
                <h2
                  id="visual-candidates-heading"
                  className="mt-2 text-3xl font-extrabold text-on-surface"
                >
                  {selectedCharacter?.name ?? "Karakter"} için seçenekler
                </h2>
              </div>

              {state.candidates.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-outline-variant bg-white/75 p-8 text-center text-on-surface-variant">
                  Henüz görsel adayı oluşturulmadı.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {state.candidates.map((candidate) => {
                    const isCanon =
                      state.canon?.selectedAssetId === candidate.id;
                    const contentUrl = `/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(candidate.id)}?householdId=${encodeURIComponent(householdId)}`;
                    return (
                      <article
                        className="overflow-hidden rounded-[1.8rem] border border-outline-variant/70 bg-white/90 shadow-sm"
                        key={candidate.id}
                      >
                        <div className="relative aspect-square bg-surface-container-low">
                          <Image
                            alt={`${selectedCharacter?.name ?? "Karakter"} görsel adayı`}
                            className="object-cover"
                            fill
                            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                            src={contentUrl}
                            unoptimized
                          />
                        </div>
                        <div className="p-5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-extrabold text-on-surface">
                              Aday {candidate.candidateIndex + 1}
                            </span>
                            <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
                              {isCanon
                                ? "Seçili görünüm"
                                : candidate.lifecycleState}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-on-surface-variant">
                            {candidate.model ??
                              candidate.provider ??
                              "Görsel üretimi"}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {!isCanon &&
                            candidate.lifecycleState !== "rejected" ? (
                              <button
                                className="storybook-button"
                                disabled={busy}
                                onClick={() =>
                                  void act({
                                    action: "select",
                                    assetId: candidate.id,
                                  })
                                }
                                type="button"
                              >
                                Bu görünümü seç
                              </button>
                            ) : null}
                            {!isCanon &&
                            candidate.lifecycleState !== "rejected" ? (
                              <button
                                className="storybook-button-secondary"
                                disabled={busy}
                                onClick={() =>
                                  void act({
                                    action: "reject",
                                    assetId: candidate.id,
                                  })
                                }
                                type="button"
                              >
                                Ele
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  );
}
