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

type CandidateFilter = "active" | "all" | "rejected" | "archived";
type AspectRatio = "1:1" | "4:3" | "3:2" | "16:9" | "4:5" | "2:3" | "9:16";

const aspectRatioOptions: Array<{ value: AspectRatio; label: string }> = [
  { value: "1:1", label: "Kare · 1:1" },
  { value: "4:5", label: "Portre · 4:5" },
  { value: "2:3", label: "Uzun portre · 2:3" },
  { value: "4:3", label: "Yatay · 4:3" },
  { value: "16:9", label: "Geniş · 16:9" },
];

function friendlyError(message: string) {
  if (message === "OPENROUTER_API_KEY_NOT_CONFIGURED") {
    return "Görsel üretimi için OpenRouter anahtarı henüz ayarlanmamış. Ayarlar bölümünden API anahtarını ekleyin.";
  }
  if (message.includes("FORBIDDEN")) {
    return "Bu karakterin görsellerini yönetme yetkiniz yok.";
  }
  return message;
}

function lifecycleLabel(candidate: VisualCandidate, isCanon: boolean) {
  if (isCanon) return "Aktif görünüm";
  if (candidate.lifecycleState === "candidate") return "Aday";
  if (candidate.lifecycleState === "rejected") return "Elendi";
  return "Eski canon";
}

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
  const [candidateCount, setCandidateCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [filter, setFilter] = useState<CandidateFilter>("active");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = (await response.json()) as LibraryResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Görsel kütüphanesi okunamadı.");
      }
      setState(payload);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    setMessage(null);
    setSuccessMessage(null);
    void refresh().catch((error: unknown) => {
      const text =
        error instanceof Error ? error.message : "Görseller yüklenemedi.";
      setMessage(friendlyError(text));
    });
  }, [refresh]);

  async function act(body: Record<string, unknown>, successText: string) {
    if (!endpoint) return;
    setBusy(true);
    setMessage(null);
    setSuccessMessage(null);
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
      setSuccessMessage(successText);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "İşlem tamamlanamadı.";
      setMessage(friendlyError(text));
    } finally {
      setBusy(false);
    }
  }

  const canonCandidate = useMemo(
    () =>
      state.candidates.find(
        (candidate) => candidate.id === state.canon?.selectedAssetId,
      ) ?? null,
    [state.candidates, state.canon?.selectedAssetId],
  );

  const visibleCandidates = useMemo(() => {
    if (filter === "all") return state.candidates;
    if (filter === "rejected") {
      return state.candidates.filter(
        (candidate) => candidate.lifecycleState === "rejected",
      );
    }
    if (filter === "archived") {
      return state.candidates.filter(
        (candidate) => candidate.lifecycleState === "archived",
      );
    }
    return state.candidates.filter(
      (candidate) =>
        candidate.lifecycleState === "candidate" ||
        candidate.id === state.canon?.selectedAssetId,
    );
  }, [filter, state.candidates, state.canon?.selectedAssetId]);

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
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-5 py-8 md:px-6 md:py-10">
        <header className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-7 shadow-sm md:p-9">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Asset Management
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-on-surface md:text-4xl">
                Görsel Kütüphanesi
              </h1>
              <p className="mt-3 max-w-[52rem] leading-7 text-on-surface-variant">
                Mevcut karakter verilerinden yeni görseller üretin, adayları
                karşılaştırın ve hikâyelerde kullanılacak kalıcı görünümü seçin.
                Üretim karakter oluşturma işleminden bağımsızdır.
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
            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-6 shadow-sm md:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                  Üretim kontrolü
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
                  Yeni adaylar oluştur
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-extrabold text-on-surface">
                    Karakter
                    <select
                      className="mt-2 w-full rounded-2xl border border-outline-variant bg-white px-4 py-3 font-medium text-on-surface"
                      value={characterId}
                      onChange={(event) => setCharacterId(event.target.value)}
                    >
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-extrabold text-on-surface">
                    Görsel oranı
                    <select
                      aria-label="Görsel oranı"
                      className="mt-2 w-full rounded-2xl border border-outline-variant bg-white px-4 py-3 font-medium text-on-surface"
                      value={aspectRatio}
                      onChange={(event) =>
                        setAspectRatio(event.target.value as AspectRatio)
                      }
                    >
                      {aspectRatioOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {selectedCharacter ? (
                  <div className="mt-4 rounded-2xl bg-surface-container-low px-4 py-4">
                    <p className="text-sm font-extrabold text-on-surface">
                      {selectedCharacter.name}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                      {selectedCharacter.originConcept}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5">
                  <p className="text-sm font-extrabold text-on-surface">
                    Kaç aday üretelim?
                  </p>
                  <div
                    className="mt-2 flex flex-wrap gap-2"
                    role="group"
                    aria-label="Aday sayısı"
                  >
                    {[1, 2, 3, 4].map((count) => (
                      <button
                        aria-pressed={candidateCount === count}
                        className={
                          candidateCount === count
                            ? "storybook-button"
                            : "storybook-button-secondary"
                        }
                        disabled={busy}
                        key={count}
                        onClick={() => setCandidateCount(count)}
                        type="button"
                      >
                        {count} aday
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                    Model: krea/krea-2-medium-turbo · Her aday ayrı yönetilir ve
                    hiçbir üretim mevcut canon’u otomatik değiştirmez.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="storybook-button"
                    disabled={busy || loading}
                    onClick={() =>
                      void act(
                        {
                          action: "generate",
                          idempotencyKey: `visual-${characterId}-${crypto.randomUUID()}`,
                          candidateCount,
                          aspectRatio,
                        },
                        `${candidateCount} yeni görsel adayı oluşturuldu.`,
                      )
                    }
                    type="button"
                  >
                    {busy
                      ? "Görsel üretiliyor…"
                      : `${candidateCount} görsel üret`}
                  </button>
                  <button
                    className="storybook-button-secondary"
                    disabled={busy || loading}
                    onClick={() => void refresh()}
                    type="button"
                  >
                    {loading ? "Yükleniyor…" : "Kütüphaneyi yenile"}
                  </button>
                </div>

                {message ? (
                  <p className="mt-4 rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {message}
                  </p>
                ) : null}
                {successMessage ? (
                  <p className="mt-4 rounded-2xl bg-surface-container px-4 py-3 text-sm font-bold text-on-surface">
                    {successMessage}
                  </p>
                ) : null}
              </div>

              <aside className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-6 shadow-sm md:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                  Aktif canon
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
                  Hikâyelerde kullanılacak görünüm
                </h2>

                {canonCandidate && householdId ? (
                  <>
                    <div className="relative mt-5 aspect-square overflow-hidden rounded-[1.6rem] bg-surface-container-low">
                      <Image
                        alt={`${selectedCharacter?.name ?? "Karakter"} aktif görünümü`}
                        className="object-cover"
                        fill
                        sizes="(min-width: 1024px) 40vw, 100vw"
                        src={`/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(canonCandidate.id)}?householdId=${encodeURIComponent(householdId)}`}
                        unoptimized
                      />
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-extrabold text-on-surface">
                          {selectedCharacter?.name}
                        </p>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          Canon v{state.canon?.version ?? 1}
                          {state.canon?.selectedAt
                            ? ` · ${new Date(state.canon.selectedAt).toLocaleDateString("tr-TR")}`
                            : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-extrabold text-on-surface">
                        Aktif
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                      {canonCandidate.model ??
                        canonCandidate.provider ??
                        "Görsel üretimi"}
                    </p>
                  </>
                ) : (
                  <div className="mt-5 rounded-[1.6rem] border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
                    <p className="font-extrabold text-on-surface">
                      Henüz canon seçilmedi
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      Önce bir veya daha fazla aday üretin, sonra aşağıdaki
                      kütüphaneden “Canon yap” seçeneğini kullanın.
                    </p>
                  </div>
                )}
              </aside>
            </section>

            <section aria-labelledby="visual-candidates-heading">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                    Görsel adayları
                  </p>
                  <h2
                    id="visual-candidates-heading"
                    className="mt-2 text-3xl font-extrabold text-on-surface"
                  >
                    {selectedCharacter?.name ?? "Karakter"} kütüphanesi
                  </h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {state.candidates.length} toplam asset ·{" "}
                    {visibleCandidates.length} gösteriliyor
                  </p>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Görsel filtresi"
                >
                  {(
                    [
                      ["active", "Aktif adaylar"],
                      ["all", "Tümü"],
                      ["rejected", "Elenenler"],
                      ["archived", "Geçmiş canon"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      aria-pressed={filter === value}
                      className={
                        filter === value
                          ? "storybook-button"
                          : "storybook-button-secondary"
                      }
                      key={value}
                      onClick={() => setFilter(value)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {loading && state.candidates.length === 0 ? (
                <div className="mt-5 rounded-[2rem] border border-outline-variant/70 bg-white/75 p-8 text-center text-on-surface-variant">
                  Görsel kütüphanesi yükleniyor…
                </div>
              ) : visibleCandidates.length === 0 ? (
                <div className="mt-5 rounded-[2rem] border border-dashed border-outline-variant bg-white/75 p-8 text-center text-on-surface-variant">
                  Bu filtrede gösterilecek görsel yok.
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {visibleCandidates.map((candidate) => {
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
                              {lifecycleLabel(candidate, isCanon)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                            {candidate.width && candidate.height
                              ? `${candidate.width}×${candidate.height} · `
                              : ""}
                            {candidate.model ??
                              candidate.provider ??
                              "Görsel üretimi"}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {new Date(candidate.createdAt).toLocaleString(
                              "tr-TR",
                            )}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {!isCanon &&
                            candidate.lifecycleState !== "rejected" ? (
                              <button
                                className="storybook-button"
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    { action: "select", assetId: candidate.id },
                                    "Karakterin aktif görünümü güncellendi.",
                                  )
                                }
                                type="button"
                              >
                                Canon yap
                              </button>
                            ) : null}
                            {!isCanon &&
                            candidate.lifecycleState !== "rejected" ? (
                              <button
                                className="storybook-button-secondary"
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    { action: "reject", assetId: candidate.id },
                                    "Görsel adaylardan çıkarıldı; provenance kaydı korundu.",
                                  )
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
