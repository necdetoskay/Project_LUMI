"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { newIdempotencyKey } from "@/lib/new-id";
import { CanonicalBagImage } from "@/components/assets/canonical-bag-image";
import { CanonicalItemImage } from "@/components/assets/canonical-item-image";

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
type AssetTab = "character" | "bag" | "items";
type ActiveOperation =
  | { type: "character-generate" }
  | { type: "bag-generate" }
  | { type: "item-generate"; itemIds: string[] }
  | { type: "canon-select"; assetId: string }
  | { type: "candidate-reject"; assetId: string }
  | null;
type ItemGenerationState = "idle" | "generating" | "ready" | "failed";
type BagVariant = "bag-closed" | "bag-open";
type LightboxImage = {
  src: string;
  alt: string;
  label: string;
} | null;

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
  const [activeTab, setActiveTab] = useState<AssetTab>("character");
  const [activeOperation, setActiveOperation] = useState<ActiveOperation>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPreviewByCandidate, setSelectedPreviewByCandidate] = useState<
    Record<string, string>
  >({});
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [assetRevision, setAssetRevision] = useState(0);
  const [bagVariant, setBagVariant] = useState<BagVariant>("bag-closed");
  const [lightboxImage, setLightboxImage] = useState<LightboxImage>(null);
  const [itemGenerationState, setItemGenerationState] = useState<
    Record<string, ItemGenerationState>
  >({});

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
        setItemGenerationState({});
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setInventoryItems([]);
          setSelectedItemIds([]);
        }
      });
    return () => controller.abort();
  }, [characterId, householdId]);

  async function generateItemBatch(requestedItemIds = selectedItemIds) {
    if (!householdId || !characterId || requestedItemIds.length === 0) return;
    const itemIds = [...requestedItemIds];
    setActiveOperation({ type: "item-generate", itemIds });
    setItemGenerationState((current) => ({
      ...current,
      ...Object.fromEntries(itemIds.map((id) => [id, "generating"])),
    }));
    setMessage(null);
    setSuccessMessage(null);
    try {
      const results = await Promise.allSettled(
        itemIds.map(async (itemId) => {
          const response = await fetch("/api/assets/items/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              householdId,
              characterId,
              itemIds: [itemId],
              idempotencyKey: `item-direct-${itemId}-${newIdempotencyKey()}`,
            }),
          });
          const payload = await readJsonResponse<{ error?: string }>(
            response,
            "Eşya görseli üretilemedi.",
          );
          if (!response.ok) {
            throw new Error(payload.error ?? "Eşya görseli üretilemedi.");
          }
          return itemId;
        }),
      );
      const nextStates: Record<string, ItemGenerationState> = {};
      let succeeded = 0;
      results.forEach((result, index) => {
        const itemId = itemIds[index];
        if (!itemId) return;
        const ready = result.status === "fulfilled";
        nextStates[itemId] = ready ? "ready" : "failed";
        if (ready) succeeded += 1;
      });
      setItemGenerationState((current) => ({ ...current, ...nextStates }));
      setAssetRevision((current) => current + 1);
      if (succeeded === itemIds.length) {
        setSuccessMessage(`${succeeded} eşya görseli hazırlandı.`);
      } else {
        setMessage(
          `${succeeded} eşya hazırlandı; ${itemIds.length - succeeded} eşya üretilemedi. Başarısız kartlardan tekrar deneyebilirsiniz.`,
        );
      }
    } catch (error) {
      setItemGenerationState((current) => ({
        ...current,
        ...Object.fromEntries(itemIds.map((id) => [id, "failed"])),
      }));
      setMessage(
        friendlyError(
          error instanceof Error
            ? error.message
            : "Eşya görselleri üretilemedi.",
        ),
      );
    } finally {
      setActiveOperation(null);
    }
  }

  async function generateBag() {
    if (!householdId || !characterId || !selectedCharacter) return;
    setActiveOperation({ type: "bag-generate" });
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
      const payload = await readJsonResponse<{
        assets?: VisualCandidate[];
        error?: string;
      }>(response, "Çanta görselleri üretilemedi.");
      if (!response.ok)
        throw new Error(payload.error ?? "Çanta görselleri üretilemedi.");
      setAssetRevision((current) => current + 1);
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
      setActiveOperation(null);
    }
  }

  async function act(body: Record<string, unknown>, successText: string) {
    if (!endpoint) return;
    const operation: ActiveOperation =
      body.action === "generate"
        ? { type: "character-generate" }
        : body.action === "select" && typeof body.assetId === "string"
          ? { type: "canon-select", assetId: body.assetId }
          : body.action === "reject" && typeof body.assetId === "string"
            ? { type: "candidate-reject", assetId: body.assetId }
            : null;
    setActiveOperation(operation);
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
      setActiveOperation(null);
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
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-3 py-4 sm:px-4 md:gap-6 md:px-6 md:py-10">
        <header className="border-b border-outline-variant/70 pb-4 md:rounded-[1.5rem] md:border md:bg-white/85 md:p-7 md:shadow-sm">
          <div className="flex items-start justify-between gap-3 md:items-end">
            <div>
              <p className="hidden text-xs font-extrabold uppercase tracking-[0.14em] text-primary md:block">
                Asset Management
              </p>
              <h1 className="text-2xl font-extrabold text-on-surface md:mt-2 md:text-4xl">
                Görsel Kütüphanesi
              </h1>
              <p className="mt-1 max-w-[52rem] text-sm leading-6 text-on-surface-variant md:mt-3 md:text-base md:leading-7">
                Karakter, çanta ve eşya görsellerini ayrı alanlarda üretin.
              </p>
            </div>
            <Link
              aria-label="Aile evine dön"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant bg-white text-on-surface shadow-sm md:size-auto md:px-4 md:py-3"
              href="/app"
            >
              <span className="material-symbols-outlined text-xl md:hidden">
                arrow_back
              </span>
              <span className="hidden font-extrabold md:inline">
                Aile evine dön
              </span>
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
            <section className="sticky top-0 z-30 -mx-3 border-b border-outline-variant/70 bg-surface/95 px-3 py-3 backdrop-blur md:static md:mx-0 md:rounded-[1.5rem] md:border md:bg-white/85 md:p-5 md:shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <label className="w-full text-sm font-extrabold text-on-surface md:max-w-sm">
                  Karakter
                  <select
                    className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 font-medium text-on-surface md:mt-2 md:rounded-2xl md:px-4 md:py-3"
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
                <div
                  className="grid w-full grid-cols-3 gap-2 md:max-w-xl"
                  role="tablist"
                  aria-label="Görsel çalışma alanları"
                >
                  {(
                    [
                      ["character", "Karakter", "person"],
                      ["bag", "Çanta", "backpack"],
                      ["items", "Eşyalar", "category"],
                    ] as const
                  ).map(([value, label, icon]) => (
                    <button
                      aria-selected={activeTab === value}
                      className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-extrabold transition md:rounded-2xl md:px-3 md:py-3 md:text-sm ${activeTab === value ? "border-primary bg-primary text-on-primary shadow-md" : "border-outline-variant bg-white text-on-surface hover:border-primary"}`}
                      key={value}
                      onClick={() => {
                        setActiveTab(value);
                        setMessage(null);
                        setSuccessMessage(null);
                      }}
                      role="tab"
                      type="button"
                    >
                      <span className="material-symbols-outlined mr-1 align-middle text-base md:text-lg">
                        {icon}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {selectedCharacter ? (
                <p className="mt-3 line-clamp-2 text-xs text-on-surface-variant md:mt-4 md:text-sm">
                  <strong className="text-on-surface">
                    {selectedCharacter.name}
                  </strong>{" "}
                  · {selectedCharacter.originConcept}
                </p>
              ) : null}
            </section>

            {activeTab === "character" ? (
              <>
                <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.25rem] border border-outline-variant/70 bg-white/85 p-4 shadow-sm md:rounded-[2rem] md:p-7">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                      Üretim kontrolü
                    </p>
                    <h2 className="mt-2 text-xl font-extrabold text-on-surface md:text-2xl">
                      Yeni adaylar oluştur
                    </h2>

                    <details className="mt-4 rounded-xl border border-outline-variant bg-white px-3 py-2.5 md:mt-6 md:rounded-2xl md:px-4 md:py-3">
                      <summary className="cursor-pointer text-sm font-extrabold text-on-surface">
                        Nasıl çalışır?
                      </summary>
                      <div className="mt-2">
                        <p className="text-sm font-extrabold text-on-surface">
                          4+3 karakter referans seti
                        </p>
                        <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                          Üstte dört tam boy, altta üç yarım boy görünüm tek
                          üretimde hazırlanır ve ayrı ayrı incelenebilir.
                        </p>
                      </div>
                    </details>

                    <div className="mt-5">
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-white p-2"
                        role="group"
                        aria-label="Aday sayısı"
                      >
                        <button
                          aria-label="Aday sayısını azalt"
                          className="grid size-11 place-items-center rounded-xl border border-outline-variant bg-surface-container font-black text-on-surface disabled:opacity-40"
                          disabled={
                            activeOperation?.type === "character-generate" ||
                            candidateCount <= 1
                          }
                          onClick={() =>
                            setCandidateCount((current) =>
                              Math.max(1, current - 1),
                            )
                          }
                          type="button"
                        >
                          -
                        </button>
                        <div className="text-center">
                          <p className="text-lg font-black text-on-surface">
                            {candidateCount} aday
                          </p>
                          <p className="text-[11px] font-bold text-on-surface-variant">
                            Tahmini {candidateCount} üretim
                          </p>
                        </div>
                        <button
                          aria-label="Aday sayısını artır"
                          className="grid size-11 place-items-center rounded-xl border border-outline-variant bg-surface-container font-black text-on-surface disabled:opacity-40"
                          disabled={
                            activeOperation?.type === "character-generate" ||
                            candidateCount >= 4
                          }
                          onClick={() =>
                            setCandidateCount((current) =>
                              Math.min(4, current + 1),
                            )
                          }
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <details className="mt-2 text-xs leading-5 text-on-surface-variant">
                        <summary className="cursor-pointer font-bold">
                          Teknik ayrıntılar
                        </summary>
                        Model: krea/krea-2-medium-turbo. Her aday ayrı
                        yönetilir ve hiçbir üretim mevcut canon’u otomatik
                        değiştirmez.
                      </details>
                    </div>

                    <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                      <button
                        className="storybook-button w-full sm:w-auto"
                        disabled={
                          activeOperation?.type === "character-generate" ||
                          loading
                        }
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
                        {activeOperation?.type === "character-generate"
                          ? "Görsel üretiliyor…"
                          : `${candidateCount} görsel üret`}
                      </button>
                      <button
                        className="storybook-button-secondary w-full sm:w-auto"
                        disabled={
                          activeOperation?.type === "character-generate" ||
                          loading
                        }
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

                  <aside className="rounded-[1.25rem] border border-outline-variant/70 bg-white/85 p-4 shadow-sm md:rounded-[2rem] md:p-7">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                      Aktif canon
                    </p>
                    <h2 className="mt-2 text-xl font-extrabold text-on-surface md:text-2xl">
                      Hikâyelerde kullanılacak görünüm
                    </h2>

                    {canonCandidate && householdId ? (
                      <>
                        <button
                          className="relative mt-5 block aspect-square w-full overflow-hidden rounded-[1.2rem] bg-surface-container-low text-left md:rounded-[1.6rem]"
                          onClick={() =>
                            setLightboxImage({
                              alt: `${selectedCharacter?.name ?? "Karakter"} aktif görünümü`,
                              label: "Aktif canon",
                              src: `/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(canonBodyAsset?.id ?? canonCandidate.id)}?householdId=${encodeURIComponent(householdId)}`,
                            })
                          }
                          type="button"
                        >
                          <Image
                            alt={`${selectedCharacter?.name ?? "Karakter"} aktif görünümü`}
                            className="object-cover"
                            fill
                            sizes="(min-width: 1024px) 40vw, 100vw"
                            src={`/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(canonBodyAsset?.id ?? canonCandidate.id)}?householdId=${encodeURIComponent(householdId)}`}
                            unoptimized
                          />
                          <span className="absolute right-3 top-3 rounded-full bg-on-surface/80 px-3 py-1 text-xs font-extrabold text-white">
                            Büyüt
                          </span>
                        </button>
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
                        className="mt-2 text-2xl font-extrabold text-on-surface md:text-3xl"
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
                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
                      {visibleCandidates.map((candidate) => {
                        const isCanon =
                          state.canon?.selectedAssetId === candidate.id;
                        const candidateVariants = state.variants.filter(
                          (variant) =>
                            variant.sourceCompositeAssetId === candidate.id,
                        );
                        const preferredVariant =
                          candidateVariants.find(
                            (variant) =>
                              variant.assetKind === "body-three-quarter",
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
                            className="overflow-hidden rounded-[1.25rem] border border-outline-variant/70 bg-white/90 shadow-sm md:rounded-[1.8rem]"
                            key={candidate.id}
                          >
                            <button
                              className="relative block aspect-square w-full bg-surface-container-low text-left"
                              onClick={() =>
                                setLightboxImage({
                                  alt: `${selectedCharacter?.name ?? "Karakter"} ${previewLabel}`,
                                  label: previewLabel,
                                  src: previewUrl,
                                })
                              }
                              type="button"
                            >
                              <Image
                                alt={`${selectedCharacter?.name ?? "Karakter"} ${previewLabel}`}
                                className="object-contain p-2 transition-transform duration-300 hover:scale-[1.03] md:p-3"
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
                              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-on-surface/80 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                                Büyüt
                              </span>
                            </button>
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
                                      setSelectedPreviewByCandidate(
                                        (current) => ({
                                          ...current,
                                          [candidate.id]: candidate.id,
                                        }),
                                      )
                                    }
                                    type="button"
                                  >
                                    Tüm sayfa
                                  </button>
                                </div>
                                <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
                                  {candidateVariants.map((variant) => {
                                    const variantLabel =
                                      variantLabels[variant.assetKind ?? ""] ??
                                      variant.assetKind ??
                                      "Görünüm";
                                    const roleLabel =
                                      variantRoleLabels[
                                        variant.assetKind ?? ""
                                      ];
                                    const isSelected =
                                      selectedPreviewId === variant.id;
                                    return (
                                      <button
                                        aria-label={`${variantLabel}${roleLabel ? ` — ${roleLabel}` : ""}`}
                                        aria-pressed={isSelected}
                                        className={`group relative w-24 shrink-0 rounded-xl border-2 p-1 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 md:w-auto ${
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
                                        <p className="mt-1.5 text-center text-[10px] font-extrabold leading-3 text-on-surface-variant">
                                          {variantLabel}
                                        </p>
                                        {roleLabel ? (
                                          <p className="mt-1 rounded-full bg-secondary-container px-1.5 py-0.5 text-center text-[9px] font-extrabold leading-3 text-on-secondary-container">
                                            {roleLabel}
                                          </p>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                            <div className="p-4 md:p-5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-extrabold text-on-surface">
                                  Aday {candidate.candidateIndex + 1}
                                </span>
                                <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
                                  {lifecycleLabel(candidate, isCanon)}
                                </span>
                              </div>
                              <details className="mt-2 text-xs leading-5 text-on-surface-variant">
                                <summary className="cursor-pointer font-bold">
                                  Ayrıntılar
                                </summary>
                                {candidate.width && candidate.height
                                  ? `${candidate.width}×${candidate.height} · `
                                  : ""}
                                {candidate.model ??
                                  candidate.provider ??
                                  "Görsel üretimi"}{" "}
                                ·{" "}
                                {new Date(candidate.createdAt).toLocaleString(
                                  "tr-TR",
                                )}
                              </details>
                              <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                                {!isCanon &&
                                candidate.lifecycleState !== "rejected" ? (
                                  <button
                                    className="storybook-button w-full sm:w-auto"
                                    disabled={
                                      activeOperation?.type ===
                                        "canon-select" &&
                                      activeOperation.assetId === candidate.id
                                    }
                                    onClick={() =>
                                      void act(
                                        {
                                          action: "select",
                                          assetId: candidate.id,
                                        },
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
                                    className="storybook-button-secondary w-full sm:w-auto"
                                    disabled={
                                      activeOperation?.type ===
                                        "candidate-reject" &&
                                      activeOperation.assetId === candidate.id
                                    }
                                    onClick={() =>
                                      void act(
                                        {
                                          action: "reject",
                                          assetId: candidate.id,
                                        },
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
            ) : null}

            {activeTab === "bag" ? (
              <section
                className="rounded-[1.25rem] border border-outline-variant/70 bg-white/85 p-4 shadow-sm md:rounded-[2rem] md:p-8"
                aria-labelledby="bag-workspace-heading"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                      Çanta çalışma alanı
                    </p>
                    <h2
                      id="bag-workspace-heading"
                      className="mt-2 text-2xl font-extrabold text-on-surface md:text-3xl"
                    >
                      Açık ve kapalı çanta
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                      Aynı tasarıma sahip iki çanta görünümü birlikte
                      hazırlanır. Yeni sonuçlar üretim tamamlanır tamamlanmaz
                      burada görünür.
                    </p>
                  </div>
                  <button
                    className="storybook-button w-full md:w-auto"
                    disabled={
                      activeOperation?.type === "bag-generate" ||
                      !selectedCharacter
                    }
                    onClick={() => void generateBag()}
                    type="button"
                  >
                    {activeOperation?.type === "bag-generate"
                      ? "Çanta hazırlanıyor…"
                      : "Çanta görselleri üret"}
                  </button>
                </div>
                <div
                  className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-surface-container-low p-1"
                  role="group"
                  aria-label="Çanta görünümü"
                >
                  {(["bag-closed", "bag-open"] as const).map((variant) => (
                    <button
                      aria-pressed={bagVariant === variant}
                      className={`min-h-11 rounded-xl px-3 py-2 text-sm font-extrabold transition ${
                        bagVariant === variant
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant"
                      }`}
                      key={variant}
                      onClick={() => setBagVariant(variant)}
                      type="button"
                    >
                      {variant === "bag-open" ? "Açık" : "Kapalı"}
                    </button>
                  ))}
                </div>
                {activeOperation?.type === "bag-generate" ? (
                  <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-outline-variant bg-surface-container-low p-4">
                    <div className="aspect-square animate-pulse rounded-2xl bg-primary/10" />
                    <p className="mt-3 font-extrabold text-on-surface">
                      {bagVariant === "bag-open"
                        ? "Açık çanta hazırlanıyor"
                        : "Kapalı çanta hazırlanıyor"}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Görsel üretimi biraz sürebilir.
                    </p>
                  </div>
                ) : (
                  <article
                    className="mt-5 overflow-hidden rounded-[1.4rem] border border-outline-variant bg-surface-container-low p-3 md:p-4"
                    key={`${bagVariant}-${assetRevision}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-extrabold text-on-surface">
                        {bagVariant === "bag-open"
                          ? "Açık çanta"
                          : "Kapalı çanta"}
                      </p>
                      <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-extrabold text-on-secondary-container">
                        Aktif çanta
                      </span>
                    </div>
                    <CanonicalBagImage
                      characterId={characterId}
                      householdId={householdId}
                      characterName={selectedCharacter?.name ?? "Karakter"}
                      variant={bagVariant}
                      className="aspect-square rounded-2xl bg-white"
                    />
                  </article>
                )}
                {message ? (
                  <p className="mt-5 rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {message}
                  </p>
                ) : null}
                {successMessage ? (
                  <p className="mt-5 rounded-2xl bg-surface-container px-4 py-3 text-sm font-bold text-on-surface">
                    {successMessage}
                  </p>
                ) : null}
              </section>
            ) : null}

            {activeTab === "items" ? (
              <section
                className="rounded-[1.25rem] border border-outline-variant/70 bg-white/85 p-4 pb-28 shadow-sm md:rounded-[2rem] md:p-8"
                aria-labelledby="item-workspace-heading"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                      Eşya çalışma alanı
                    </p>
                    <h2
                      id="item-workspace-heading"
                      className="mt-2 text-2xl font-extrabold text-on-surface md:text-3xl"
                    >
                      Çantadaki eşyalar
                    </h2>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      En fazla 6 eşya seçin · {selectedItemIds.length}/6 seçili
                    </p>
                  </div>
                  <button
                    className="storybook-button hidden md:inline-flex"
                    disabled={
                      activeOperation?.type === "item-generate" ||
                      selectedItemIds.length === 0
                    }
                    onClick={() => void generateItemBatch()}
                    type="button"
                  >
                    {activeOperation?.type === "item-generate"
                      ? "Eşyalar hazırlanıyor…"
                      : `Seçilen ${selectedItemIds.length} eşyayı üret`}
                  </button>
                </div>
                {inventoryItems.length > 0 ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 lg:grid-cols-3">
                    {inventoryItems.map((item) => {
                      const selected = selectedItemIds.includes(item.id);
                      const generationState =
                        itemGenerationState[item.id] ?? "idle";
                      return (
                        <article
                          className={`relative overflow-hidden rounded-[1.1rem] border-2 p-2.5 transition md:rounded-[1.6rem] md:p-3 ${selected ? "border-primary bg-primary/5 shadow-md" : "border-outline-variant bg-white"}`}
                          key={`${item.id}-${assetRevision}`}
                        >
                          <button
                            aria-label={`${item.displayName} seç`}
                            aria-pressed={selected}
                            className="absolute right-2 top-2 z-20 grid size-8 place-items-center rounded-full border border-outline-variant bg-white font-black text-primary shadow-sm"
                            disabled={!selected && selectedItemIds.length >= 6}
                            onClick={() =>
                              setSelectedItemIds((current) =>
                                selected
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id].slice(0, 6),
                              )
                            }
                            type="button"
                          >
                            {selected ? "✓" : ""}
                            <span className="sr-only">{item.displayName}</span>
                          </button>
                          <div className="relative">
                            <CanonicalItemImage
                              itemId={item.id}
                              householdId={householdId}
                              itemName={item.displayName}
                              className="aspect-square rounded-xl md:rounded-2xl"
                              sizes="(min-width: 1024px) 280px, 45vw"
                            />
                            {generationState === "generating" ? (
                              <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/75 text-sm font-extrabold text-primary md:rounded-2xl">
                                Üretiliyor…
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-col gap-2 md:mt-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="line-clamp-2 text-sm font-extrabold leading-5 text-on-surface md:text-base">
                                {item.displayName}
                              </p>
                              <p className="mt-1 hidden text-xs text-on-surface-variant md:block">
                                {item.category} · {item.rarity}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${generationState === "failed" ? "bg-error-container text-on-error-container" : generationState === "ready" ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant"}`}
                            >
                              {generationState === "failed"
                                ? "Başarısız"
                                : generationState === "ready"
                                  ? "Hazır"
                                  : generationState === "generating"
                                    ? "Bekleyin"
                                    : "Seçilebilir"}
                            </span>
                          </div>
                          {generationState === "failed" ? (
                            <button
                              className="storybook-button-secondary relative z-20 mt-3 w-full"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedItemIds([item.id]);
                                void generateItemBatch([item.id]);
                              }}
                              type="button"
                            >
                              Tekrar dene
                            </button>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
                    Bu karakterin çantasında henüz eşya yok.
                  </div>
                )}
                {message ? (
                  <p className="mt-5 rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {message}
                  </p>
                ) : null}
                {successMessage ? (
                  <p className="mt-5 rounded-2xl bg-surface-container px-4 py-3 text-sm font-bold text-on-surface">
                    {successMessage}
                  </p>
                ) : null}
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/70 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
                  <div className="mx-auto flex max-w-[1240px] items-center gap-3">
                    <p className="min-w-0 flex-1 text-sm font-extrabold text-on-surface">
                      {selectedItemIds.length}/6 seçili
                    </p>
                    <button
                      className="storybook-button flex-1"
                      disabled={
                        activeOperation?.type === "item-generate" ||
                        selectedItemIds.length === 0
                      }
                      onClick={() => void generateItemBatch()}
                      type="button"
                    >
                      {activeOperation?.type === "item-generate"
                        ? "Hazırlanıyor…"
                        : `${selectedItemIds.length} eşyayı üret`}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
      {lightboxImage ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-on-surface/90 p-3 text-white"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3 pb-3">
            <div>
              <p className="text-sm font-extrabold">{lightboxImage.label}</p>
              <p className="text-xs text-white/70">{lightboxImage.alt}</p>
            </div>
            <button
              aria-label="Görseli kapat"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 font-black text-white"
              onClick={() => setLightboxImage(null)}
              type="button"
            >
              ×
            </button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black/20">
            <Image
              alt={lightboxImage.alt}
              className="object-contain"
              fill
              sizes="100vw"
              src={lightboxImage.src}
              unoptimized
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
