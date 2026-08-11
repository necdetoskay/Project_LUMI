"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type CharacterVisualLibrary = {
  canon: { selectedAssetId: string | null } | null;
  variants?: Array<{
    id: string;
    assetKind: string;
    sourceCompositeAssetId: string | null;
  }>;
};

export type CharacterVisualVariant =
  | "body-front"
  | "body-side"
  | "body-back"
  | "head-front"
  | "head-three-quarter"
  | "head-side";

export function CanonicalCharacterImage({
  characterId,
  householdId,
  characterName,
  className = "",
  sizes = "(min-width: 768px) 40vw, 100vw",
  priority = false,
  variant = "body-front",
}: {
  characterId: string;
  householdId: string | null;
  characterName: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  variant?: CharacterVisualVariant;
}) {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">(
    householdId ? "loading" : "empty",
  );

  useEffect(() => {
    if (!householdId) {
      setAssetId(null);
      setStatus("empty");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    void fetch(
      `/api/assets/characters/${encodeURIComponent(characterId)}?householdId=${encodeURIComponent(householdId)}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as CharacterVisualLibrary;
      })
      .then((library) => {
        if (controller.signal.aborted) return;
        const selectedAssetId = library?.canon?.selectedAssetId ?? null;
        const variantAsset = library?.variants?.find(
          (entry) =>
            entry.sourceCompositeAssetId === selectedAssetId &&
            entry.assetKind === variant,
        );
        const resolvedAssetId = variantAsset?.id ?? selectedAssetId;
        setAssetId(resolvedAssetId);
        setStatus(resolvedAssetId ? "ready" : "empty");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAssetId(null);
          setStatus("empty");
        }
      });

    return () => controller.abort();
  }, [characterId, householdId, variant]);

  const contentUrl = useMemo(() => {
    if (!assetId || !householdId) return null;
    return `/api/assets/characters/${encodeURIComponent(characterId)}/content/${encodeURIComponent(assetId)}?householdId=${encodeURIComponent(householdId)}`;
  }, [assetId, characterId, householdId]);

  return (
    <div
      className={`relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(109,74,255,0.35),_transparent_35%),linear-gradient(135deg,#f5eeff,#eef8ff,#fff7e9)] ${className}`}
      data-visual-state={status}
    >
      {contentUrl ? (
        <Image
          alt={`${characterName} karakter görünümü`}
          className="object-cover"
          fill
          onError={() => {
            setAssetId(null);
            setStatus("empty");
          }}
          priority={priority}
          sizes={sizes}
          src={contentUrl}
          unoptimized
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[clamp(2.5rem,10vw,5rem)] text-primary/35">
            face_6
          </span>
        </div>
      )}
      {status === "loading" ? (
        <div
          className="absolute inset-0 animate-pulse bg-white/35"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
