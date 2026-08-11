"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export function CanonicalBagImage({
  characterId,
  householdId,
  characterName,
  variant = "bag-open",
  className = "",
}: {
  characterId: string;
  householdId: string | null;
  characterName: string;
  variant?: "bag-open" | "bag-closed";
  className?: string;
}) {
  const [assetId, setAssetId] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return setAssetId(null);
    const controller = new AbortController();
    void fetch(
      `/api/assets/subjects/character/${encodeURIComponent(characterId)}?householdId=${encodeURIComponent(householdId)}&assetKind=${variant}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              canon?: { selectedAssetId?: string | null } | null;
            })
          : null,
      )
      .then((payload) => {
        if (!controller.signal.aborted) {
          setAssetId(payload?.canon?.selectedAssetId ?? null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setAssetId(null);
      });
    return () => controller.abort();
  }, [characterId, householdId, variant]);

  const src = useMemo(
    () =>
      assetId && householdId
        ? `/api/assets/subjects/character/${encodeURIComponent(characterId)}/content/${encodeURIComponent(assetId)}?householdId=${encodeURIComponent(householdId)}`
        : null,
    [assetId, characterId, householdId],
  );

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {src ? (
        <Image
          alt={`${characterName} ${variant === "bag-open" ? "açık" : "kapalı"} çanta görseli`}
          className="object-contain"
          fill
          onError={() => setAssetId(null)}
          sizes="(min-width: 640px) 320px, 90vw"
          src={src}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-surface-container-low">
          <span className="material-symbols-outlined text-6xl text-primary/30">
            backpack
          </span>
        </div>
      )}
    </div>
  );
}
