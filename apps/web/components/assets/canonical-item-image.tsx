"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ItemAssetLibrary = {
  canon: { selectedAssetId: string | null } | null;
};

export function CanonicalItemImage({
  itemId,
  householdId,
  itemName,
  className = "",
  sizes = "96px",
}: {
  itemId: string;
  householdId: string | null;
  itemName: string;
  className?: string;
  sizes?: string;
}) {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(householdId));

  useEffect(() => {
    if (!householdId) {
      setAssetId(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void fetch(
      `/api/assets/subjects/item/${encodeURIComponent(itemId)}?householdId=${encodeURIComponent(householdId)}&assetKind=item-icon`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) =>
        response.ok ? ((await response.json()) as ItemAssetLibrary) : null,
      )
      .then((library) => {
        if (controller.signal.aborted) return;
        setAssetId(library?.canon?.selectedAssetId ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAssetId(null);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [householdId, itemId]);

  const src = useMemo(() => {
    if (!assetId || !householdId) return null;
    return `/api/assets/subjects/item/${encodeURIComponent(itemId)}/content/${encodeURIComponent(assetId)}?householdId=${encodeURIComponent(householdId)}`;
  }, [assetId, householdId, itemId]);

  return (
    <div
      className={`relative overflow-hidden bg-white/80 ${className}`}
      data-visual-state={loading ? "loading" : src ? "ready" : "empty"}
    >
      {src ? (
        <Image
          alt={`${itemName} eşya görseli`}
          className="object-contain p-1"
          fill
          onError={() => setAssetId(null)}
          sizes={sizes}
          src={src}
          unoptimized
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-3xl text-primary/35">
            category
          </span>
        </div>
      )}
      {loading ? (
        <div
          className="absolute inset-0 animate-pulse bg-white/50"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
