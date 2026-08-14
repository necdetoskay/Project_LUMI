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

type VisualPreviewCandidate = {
  index: number;
  bytesBase64: string;
  mimeType: string;
  width?: number;
  height?: number;
  providerMetadata?: Record<string, unknown>;
};

type VisualPreview = {
  previewId: string;
  visualBriefVersion: string;
  visualBriefFingerprint: string;
  provider: string;
  model: string;
  providerRequestId?: string;
  candidates: VisualPreviewCandidate[];
  usageMetadata?: Record<string, unknown>;
  costMetadata?: Record<string, unknown>;
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
  const [pendingDelete, setPendingDelete] = useState<VisualCandidate | null>(
    null,
  );
  const [preview, setPreview] = useState<VisualPreview | null>(null);

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

  const contentUrl = (assetId: string) =>
    `/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(assetId)}?householdId=${encodeURIComponent(householdId)}`;

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

  async function generatePreview() {
    setBusy("generate");
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          candidateCount,
          aspectRatio: "3:2",
          mode: "reference-sheet",
        }),
      });
      const payload = (await response.json()) as {
        preview?: VisualPreview;
        error?: string;
      };
      if (!response.ok || !payload.preview) {
        throw new Error(payload.error ?? "Önizleme oluşturulamadı.");
      }
      setPreview(payload.preview);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Önizleme oluşturulamadı.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function commitPreview() {
    if (!preview) return;
    setBusy("commit");
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          idempotencyKey: `visual-${characterId}-${newIdempotencyKey()}`,
          aspectRatio: "3:2",
          mode: "reference-sheet",
          preview,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Görsel kaydedilemedi.");
      }
      const committedCount = preview.candidates.length;
      setPreview(null);
      await refresh();
      setMessage(`${committedCount} yeni karakter görseli hazırlandı.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Görsel kaydedilemedi.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function confirmDeleteVariant() {
    if (!pendingDelete) return;
    await act(
      { action: "delete", assetId: pendingDelete.id },
      "Görünüm varyantı silindi.",
    );
    setPendingDelete(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase text-primary">
            Karakter görselleri
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
            Görsel kimlik
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Canonical görünümü seç, yeni adayları önce onay ekranında incele ve
            karakter kimliğini koruyan varyantları yönet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-extrabold text-on-surface-variant">
            Aday
            <select
              className="ml-2 rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-bold text-on-surface"
              disabled={busy === "generate" || busy === "commit"}
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
            disabled={busy === "generate" || busy === "commit"}
            onClick={() => void generatePreview()}
            type="button"
          >
            {busy === "generate" ? "Üretiliyor..." : "Yeni aday üret"}
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
              <p className="text-xs font-extrabold uppercase text-primary">
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
              <p className="text-xs font-extrabold uppercase text-primary">
                Üretilmiş adaylar
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Karaktere ait üretilmiş görseller arasından aktif görünümü seç.
              </p>
            </div>
            <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-extrabold text-on-surface-variant">
              {loading ? "..." : activeCandidates.length}
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
                "Yeni aday üret" ile ilk görsel setini oluşturabilirsin.
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
            <p className="text-xs font-extrabold uppercase text-primary">
              Görünüm varyantları
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Referans sheet'ten türetilen canon açılar burada korunur.
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
                className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"
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
                <button
                  aria-label="Varyantı sil"
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 text-on-surface opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100"
                  disabled={busy === "delete"}
                  onClick={() => setPendingDelete(variant)}
                  title="Varyantı sil"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {preview ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-4xl sm:rounded-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase text-primary">
                  Önizleme
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-on-surface">
                  Yeni aday sheet
                </h3>
              </div>
              <button
                aria-label="Önizlemeyi kapat"
                className="grid size-9 place-items-center rounded-full bg-surface-container text-on-surface"
                disabled={busy === "commit" || busy === "generate"}
                onClick={() => setPreview(null)}
                type="button"
              >
                <span className="material-symbols-outlined text-base">
                  close
                </span>
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {preview.candidates.map((candidate) => (
                <div
                  className="relative aspect-[3/2] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"
                  key={candidate.index}
                >
                  <Image
                    alt={`${characterName} yeni aday sheet önizlemesi`}
                    className="object-contain p-2"
                    fill
                    sizes="(min-width: 640px) 45vw, 100vw"
                    src={`data:${candidate.mimeType};base64,${candidate.bytesBase64}`}
                    unoptimized
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="storybook-button-secondary"
                disabled={busy === "commit" || busy === "generate"}
                onClick={() => setPreview(null)}
                type="button"
              >
                İptal
              </button>
              <button
                className="storybook-button-secondary"
                disabled={busy === "commit" || busy === "generate"}
                onClick={() => void generatePreview()}
                type="button"
              >
                {busy === "generate" ? "Üretiliyor..." : "Yeniden oluştur"}
              </button>
              <button
                className="storybook-button"
                disabled={busy === "commit" || busy === "generate"}
                onClick={() => void commitPreview()}
                type="button"
              >
                {busy === "commit" ? "Kaydediliyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-extrabold text-on-surface">
              Varyant silinsin mi?
            </h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Bu görünüm kütüphaneden kaldırılır ve kullanıldığı yerlerde
              placeholder gösterilir.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="storybook-button-secondary"
                disabled={busy === "delete"}
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="storybook-button"
                disabled={busy === "delete"}
                onClick={() => void confirmDeleteVariant()}
                type="button"
              >
                {busy === "delete" ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
