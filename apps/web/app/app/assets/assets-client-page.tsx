"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { newIdempotencyKey } from "@/lib/new-id";

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

const variantLabels: Record<string, string> = {
  "body-front": "Tam boy ön",
  "body-three-quarter": "Tam boy ¾",
  "body-side": "Tam boy profil",
  "body-back": "Tam boy arka",
  "head-front": "Yarım ön",
  "head-three-quarter": "Yarım ¾",
  "head-side": "Yarım profil",
};

const variantRoleLabels: Record<string, string> = {
  "body-three-quarter": "Ana canon",
  "head-three-quarter": "Uygulama görseli",
};

type InventoryItem = {
  id: string;
  displayName: string;
  category: string;
  rarity: string;
};

type CandidateFilter = "active" | "all" | "rejected" | "archived";
function friendlyError(message: string) {
  if (message === "OPENROUTER_API_KEY_NOT_CONFIGURED") {
    return "Görsel üretimi için OpenRouter anahtarı henüz ayarlanmamış. Ayarlar bölümünden API anahtarını ekleyin.";
  }
  if (message.includes("FORBIDDEN")) {
    return "Bu karakterin görsellerini yönetme yetkiniz yok.";
  }
  return message;
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      response.status >= 500
        ? `${fallbackMessage} Sunucu geçici olarak yanıt veremedi.`
        : fallbackMessage,
    );
  }
  return (await response.json()) as T;
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
    variants: [],
  });
  const [candidateCount, setCandidateCount] = useState(1);
  const [filter, setFilter] = useState<CandidateFilter>("active");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPreviewByCandidate, setSelectedPreviewByCandidate] = useState<
    Record<string, string>
  >({});
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

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
      const payload = await readJsonResponse<
        LibraryResponse & {
          error?: string;
        }
      >(response, "Görsel kütüphanesi okunamadı.");
      if (!response.ok) {
        throw new Error(payload.error ?? "Görsel kütüphanesi okunamadı.");
      }
      setState({
        canon: payload.canon,
        candidates: payload.candidates,
        variants: payload.variants ?? [],
      });
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

  useEffect(() => {
    if (!householdId || !characterId) {
      setInventoryItems([]);
      setSelectedItemIds([]);
      return;
    }
    const controller = new AbortController();
    void fetch(
      `/api/inventory/list?householdId=${encodeURIComponent(householdId)}&ownerType=character&ownerId=${encodeURIComponent(characterId)}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { items?: InventoryItem[] })
          : { items: [] },
      )
      .then((payload) => {
        if (controller.signal.aborted) return;
        const items = payload.items ?? [];
        setInventoryItems(items);
        setSelectedItemIds(items.slice(0, 6).map((item) => item.id));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setInventoryItems([]);
          setSelectedItemIds([]);
        }
      });
    return () => controller.abort();
  }, [characterId, householdId]);

  async function generateItemBatch() {
    if (!householdId || !characterId || selectedItemIds.length === 0) return;
    setBusy(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/assets/items/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          characterId,
          itemIds: selectedItemIds,
          idempotencyKey: `item-direct-${characterId}-${newIdempotencyKey()}`,
        }),
      });
      const payload = await readJsonResponse<{ error?: string }>(
        response,
        "Eşya görselleri üretilemedi.",
      );
      if (!response.ok)
        throw new Error(payload.error ?? "Eşya görselleri üretilemedi.");
      setSuccessMessage(
        `${selectedItemIds.length} eşya görseli hazırlandı ve çantada kullanılmaya başladı.`,
      );
    } catch (error) {
      setMessage(
        friendlyError(
          error instanceof Error
            ? error.message
            : "Eşya görselleri üretilemedi.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateBag() {
    if (!householdId || !characterId || !selectedCharacter) return;
    setBusy(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/assets/bags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          characterId,
          characterName: selectedCharacter.name,
          idempotencyKey: `bag-direct-${characterId}-${newIdempotencyKey()}`,
        }),
      });
      const payload = await readJsonResponse<{ error?: string }>(
        response,
        "Çanta görselleri üretilemedi.",
      );
      if (!response.ok)
        throw new Error(payload.error ?? "Çanta görselleri üretilemedi.");
      setSuccessMessage("Açık ve kapalı çanta görselleri hazırlandı.");
    } catch (error) {
      setMessage(
        friendlyError(
          error instanceof Error
            ? error.message
            : "Çanta görselleri üretilemedi.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

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
      const payload = await readJsonResponse<{ error?: string }>(
        response,
        "İşlem tamamlanamadı.",
      );
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
  const canonBodyAsset = useMemo(
    () =>
      state.variants.find(
        (candidate) =>
          candidate.sourceCompositeAssetId === canonCandidate?.id &&
          candidate.assetKind === "body-three-quarter",
      ) ?? canonCandidate,
    [canonCandidate, state.variants],
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
              Asset Management
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
                Asset Management
              </h1>
              <p className="mt-3 max-w-[52rem] leading-7 text-on-surface-variant">
                Karakter, NPC, konum, eşya ve hikâye sahnesi görsellerini tek
                bir varlık kütüphanesinde yönetin. Karakter üretim akışı bugün
                aktif; diğer subject türleri generic asset çekirdeğine hazırdır
                ve üretim yetenekleri Sprint 56 ile açılacaktır.
              </p>
            </div>
            <Link className="storybook-button-secondary" href="/app">
              Aile evine dön
            </Link>
          </div>
        </header>

        <section className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-6 shadow-sm md:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            Varlık türleri
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Karakter", "Aktif"],
              ["NPC", "Core hazır"],
              ["Konum", "Core hazır"],
              ["Eşya", "Core hazır"],
              ["Hikâye sahnesi", "Core hazır"],
            ].map(([label, state]) => (
              <div
                className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-4"
                key={label}
              >
                <p className="font-extrabold text-on-surface">{label}</p>
                <p className="mt-1 text-xs font-bold text-on-surface-variant">
                  {state}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">
            Sprint 55 metadata, lifecycle, provenance ve canon modelini tüm
            varlık türleri için ortaklaştırır. Yeni görsel üretim sağlayıcıları,
            batch/grid üretim ve bütçe politikası Sprint 56 kapsamındadır.
          </p>
        </section>

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

                  <div className="rounded-2xl border border-outline-variant bg-white px-4 py-3">
                    <p className="text-sm font-extrabold text-on-surface">
                      3×2 karakter referans seti
                    </p>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                      Tam vücut ve baş için ön, yan ve arka/¾ görünümler tek
                      üretimde hazırlanır.
                    </p>
                  </div>
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
                          idempotencyKey: `visual-${characterId}-${newIdempotencyKey()}`,
                          candidateCount,
                          aspectRatio: "3:2",
                          mode: "reference-sheet",
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

                <div className="mt-7 border-t border-outline-variant/60 pt-6">
                  <p className="text-sm font-extrabold text-on-surface">
                    Karakterin çantasını görselleştir
                  </p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                    Aynı tasarım yönergeleriyle açık ve kapalı çanta görselleri
                    hazırlanır.
                  </p>
                  <button
                    className="storybook-button mt-4"
                    disabled={busy || !selectedCharacter}
                    onClick={() => void generateBag()}
                    type="button"
                  >
                    {busy ? "Çanta hazırlanıyor…" : "Çanta görselleri üret"}
                  </button>
                </div>

                <div className="mt-7 border-t border-outline-variant/60 pt-6">
                  <p className="text-sm font-extrabold text-on-surface">
                    Çantadaki eşyaları toplu görselleştir
                  </p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                    En fazla 6 eşyanın her biri ayrı, doğrudan kullanılabilir
                    bir ikon olarak üretilir.
                  </p>
                  {inventoryItems.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {inventoryItems.map((item) => {
                        const checked = selectedItemIds.includes(item.id);
                        return (
                          <label
                            className="flex items-center gap-3 rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-bold text-on-surface"
                            key={item.id}
                          >
                            <input
                              checked={checked}
                              disabled={!checked && selectedItemIds.length >= 6}
                              onChange={() =>
                                setSelectedItemIds((current) =>
                                  checked
                                    ? current.filter((id) => id !== item.id)
                                    : [...current, item.id].slice(0, 6),
                                )
                              }
                              type="checkbox"
                            />
                            <span>{item.displayName}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-on-surface-variant">
                      Bu karakterin çantasında henüz eşya yok.
                    </p>
                  )}
                  <button
                    className="storybook-button mt-4"
                    disabled={busy || selectedItemIds.length === 0}
                    onClick={() => void generateItemBatch()}
                    type="button"
                  >
                    {busy
                      ? "Eşyalar hazırlanıyor…"
                      : `${selectedItemIds.length} eşya görseli üret`}
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
                        src={`/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(canonBodyAsset?.id ?? canonCandidate.id)}?householdId=${encodeURIComponent(householdId)}`}
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
                    const candidateVariants = state.variants.filter(
                      (variant) =>
                        variant.sourceCompositeAssetId === candidate.id,
                    );
                    const preferredVariant =
                      candidateVariants.find(
                        (variant) => variant.assetKind === "body-three-quarter",
                      ) ?? candidateVariants[0];
                    const selectedPreviewId =
                      selectedPreviewByCandidate[candidate.id] ??
                      preferredVariant?.id ??
                      candidate.id;
                    const selectedVariant = candidateVariants.find(
                      (variant) => variant.id === selectedPreviewId,
                    );
                    const previewAsset = selectedVariant ?? candidate;
                    const previewUrl = `/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(previewAsset.id)}?householdId=${encodeURIComponent(householdId)}`;
                    const previewLabel = selectedVariant
                      ? (variantLabels[selectedVariant.assetKind ?? ""] ??
                        "Seçili görünüm")
                      : "Referans sayfası";
                    return (
                      <article
                        className="overflow-hidden rounded-[1.8rem] border border-outline-variant/70 bg-white/90 shadow-sm"
                        key={candidate.id}
                      >
                        <div className="relative aspect-square bg-surface-container-low">
                          <Image
                            alt={`${selectedCharacter?.name ?? "Karakter"} ${previewLabel}`}
                            className="object-contain p-3 transition-transform duration-300 hover:scale-[1.03]"
                            fill
                            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                            src={previewUrl}
                            unoptimized
                          />
                          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                            <span className="rounded-full bg-on-surface/80 px-3 py-1 text-xs font-extrabold text-white shadow-sm backdrop-blur-sm">
                              {previewLabel}
                            </span>
                            {selectedVariant &&
                            variantRoleLabels[
                              selectedVariant.assetKind ?? ""
                            ] ? (
                              <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-on-primary shadow-sm">
                                {
                                  variantRoleLabels[
                                    selectedVariant.assetKind ?? ""
                                  ]
                                }
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {candidateVariants.length > 0 ? (
                          <div className="border-t border-outline-variant/60 bg-surface-container-low p-3">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-extrabold text-on-surface">
                                  Görünümü incele
                                </p>
                                <p className="mt-0.5 text-[11px] text-on-surface-variant">
                                  Büyütmek için bir parçaya dokunun.
                                </p>
                              </div>
                              <button
                                aria-pressed={
                                  selectedPreviewId === candidate.id
                                }
                                className={
                                  selectedPreviewId === candidate.id
                                    ? "rounded-full bg-primary px-3 py-1.5 text-[11px] font-extrabold text-on-primary"
                                    : "rounded-full border border-outline-variant bg-white px-3 py-1.5 text-[11px] font-extrabold text-on-surface-variant transition hover:border-primary hover:text-primary"
                                }
                                onClick={() =>
                                  setSelectedPreviewByCandidate((current) => ({
                                    ...current,
                                    [candidate.id]: candidate.id,
                                  }))
                                }
                                type="button"
                              >
                                Tüm sayfa
                              </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {candidateVariants.map((variant) => {
                                const variantLabel =
                                  variantLabels[variant.assetKind ?? ""] ??
                                  variant.assetKind ??
                                  "Görünüm";
                                const roleLabel =
                                  variantRoleLabels[variant.assetKind ?? ""];
                                const isSelected =
                                  selectedPreviewId === variant.id;
                                return (
                                  <button
                                    aria-label={`${variantLabel}${roleLabel ? ` — ${roleLabel}` : ""}`}
                                    aria-pressed={isSelected}
                                    className={`group relative rounded-xl border-2 p-1 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 ${
                                      isSelected
                                        ? "border-primary bg-primary/10 shadow-md"
                                        : "border-transparent bg-white hover:-translate-y-1 hover:border-primary/60 hover:shadow-md"
                                    }`}
                                    key={variant.id}
                                    onClick={() =>
                                      setSelectedPreviewByCandidate(
                                        (current) => ({
                                          ...current,
                                          [candidate.id]: variant.id,
                                        }),
                                      )
                                    }
                                    title={`${variantLabel}${roleLabel ? ` · ${roleLabel}` : ""}`}
                                    type="button"
                                  >
                                    <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
                                      <Image
                                        alt={`${selectedCharacter?.name ?? "Karakter"} ${variantLabel}`}
                                        className="object-contain transition-transform duration-200 group-hover:scale-110"
                                        fill
                                        sizes="120px"
                                        src={`/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(variant.id)}?householdId=${encodeURIComponent(householdId)}`}
                                        unoptimized
                                      />
                                      {isSelected ? (
                                        <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-primary text-sm font-black text-on-primary shadow-md">
                                          ✓
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-1.5 truncate text-center text-[10px] font-extrabold text-on-surface-variant">
                                      {variantLabel}
                                    </p>
                                    {roleLabel ? (
                                      <p className="mt-1 truncate rounded-full bg-secondary-container px-1.5 py-0.5 text-center text-[9px] font-extrabold text-on-secondary-container">
                                        {roleLabel}
                                      </p>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
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
