"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type WorldMapLocation = {
  id: string;
  locationKey: string;
  displayName: string;
  locationType: string;
  accessibilityStatus: string;
  accessibilityHint: string;
  isHome: boolean;
  isCurrent: boolean;
  safetyLevel: string;
};

type WorldMapRegion = {
  id: string;
  regionKey: string;
  displayName: string;
  regionType: string;
  accessibilityStatus: string;
  discoveryStatus: string;
  summary: string;
  isCurrentRegion: boolean;
  locations: WorldMapLocation[];
};

type InventoryItem = {
  id: string;
  displayName: string;
  category: string;
  rarity: string;
  quantity: number;
  conditionStatus: string;
};

type WorldMapResponse = {
  character?: {
    id: string;
    name: string;
    characterType: string;
    subtype: string;
  } | null;
  world?: {
    id: string;
    childProfileId: string;
    characterId: string;
    lifecycleStatus: string;
    homeLocationId: string | null;
    latestCheckpointId: string | null;
    currentLocation: {
      id: string;
      regionId: string;
      displayName: string;
      locationType: string;
    } | null;
    regions: WorldMapRegion[];
    npcs: Array<{
      key: string;
      name: string;
      subtype: string;
      originConcept: string;
      locationName: string;
      needTypes: string[];
      relationshipToCharacter: number;
      relationshipLabel: string;
      lastInteractionAt: string;
    }>;
  } | null;
  message?: string;
};

type OnboardingPayload = {
  onboarding?: {
    householdId: string | null;
  };
};

type InventoryResponse = {
  items?: InventoryItem[];
};

export function ProfileWorldMapSection({
  childProfileId,
  characterId,
}: {
  childProfileId: string;
  characterId?: string | null;
}) {
  const [world, setWorld] = useState<WorldMapResponse["world"]>(null);
  const [character, setCharacter] =
    useState<WorldMapResponse["character"]>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repairingWorld, setRepairingWorld] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const loadWorld = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const onboardingRes = await fetch("/api/onboarding");
      const onboardingData = (await onboardingRes.json()) as OnboardingPayload;
      const householdId = onboardingData.onboarding?.householdId ?? null;

      if (!householdId) {
        setWorld(null);
        setCharacter(null);
        setInventory([]);
        setError("Household bilgisi bulunamadi.");
        return;
      }

      const worldUrl = new URL(
        `/api/child-profiles/${encodeURIComponent(childProfileId)}/world`,
        window.location.origin,
      );
      worldUrl.searchParams.set("householdId", householdId);
      if (characterId) {
        worldUrl.searchParams.set("characterId", characterId);
      }

      const worldResponse = await fetch(worldUrl.pathname + worldUrl.search);
      const worldBody = (await worldResponse.json()) as WorldMapResponse;

      if (!worldResponse.ok) {
        setWorld(null);
        setCharacter(null);
        setInventory([]);
        setError(worldBody.message ?? "Harita bilgisi yuklenemedi.");
        return;
      }

      const nextWorld = worldBody.world ?? null;
      const nextCharacter = worldBody.character ?? null;

      setWorld(nextWorld);
      setCharacter(nextCharacter);

      if (!nextCharacter) {
        setInventory([]);
        return;
      }

      const inventoryResponse = await fetch(
        `/api/inventory/list?householdId=${encodeURIComponent(householdId)}&ownerType=character&ownerId=${encodeURIComponent(nextCharacter.id)}`,
      );

      if (!inventoryResponse.ok) {
        setInventory([]);
        return;
      }

      const inventoryBody =
        (await inventoryResponse.json()) as InventoryResponse;
      setInventory(inventoryBody.items ?? []);
    } catch {
      setWorld(null);
      setCharacter(null);
      setInventory([]);
      setError("Harita bilgisi yuklenirken bir hata olustu.");
    } finally {
      setLoading(false);
    }
  }, [characterId, childProfileId]);

  useEffect(() => {
    void loadWorld();
  }, [loadWorld]);

  const repairWorld = useCallback(async () => {
    if (!character) {
      return;
    }

    setRepairingWorld(true);
    setRepairError(null);

    try {
      const response = await fetch("/api/world", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id }),
      });
      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        setRepairError(body.message ?? "Dunya hazirlanamadi.");
        return;
      }

      await loadWorld();
    } catch {
      setRepairError("Dunya hazirlanirken bir hata olustu.");
    } finally {
      setRepairingWorld(false);
    }
  }, [character, loadWorld]);

  const discoveredRegions = useMemo(
    () => world?.regions.filter((region) => region.locations.length > 0) ?? [],
    [world?.regions],
  );

  const visibleLocations = useMemo(
    () => world?.regions.flatMap((region) => region.locations) ?? [],
    [world?.regions],
  );

  useEffect(() => {
    if (visibleLocations.length === 0) {
      setSelectedLocationId(null);
      return;
    }

    const stillVisible = visibleLocations.some(
      (location) => location.id === selectedLocationId,
    );
    if (stillVisible) {
      return;
    }

    const currentLocation =
      visibleLocations.find((location) => location.isCurrent) ??
      visibleLocations[0];
    if (!currentLocation) {
      setSelectedLocationId(null);
      return;
    }
    setSelectedLocationId(currentLocation.id);
  }, [selectedLocationId, visibleLocations]);

  const selectedLocation = useMemo(
    () =>
      visibleLocations.find((location) => location.id === selectedLocationId) ??
      null,
    [selectedLocationId, visibleLocations],
  );

  const selectedRegion = useMemo(
    () =>
      world?.regions.find((region) =>
        region.locations.some((location) => location.id === selectedLocationId),
      ) ?? null,
    [selectedLocationId, world?.regions],
  );

  const inventoryPreview = inventory.slice(0, 4);
  const inventoryCount = inventory.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <p className="text-sm text-on-surface-variant">Harita yukleniyor...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="rounded-xl border border-error-container bg-white px-5 py-4 text-sm text-error">
          {error}
        </div>
      </section>
    );
  }

  if (!character) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-14 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">
              public
            </span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">
            Harita henuz hazir degil
          </h2>
          <p className="mx-auto mt-2 max-w-[30rem] text-sm leading-6 text-on-surface-variant">
            Bu profil icin once bir karakter ve bagli dunya hazir olmali.
          </p>
        </div>
      </section>
    );
  }

  if (!world) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">
              travel_explore
            </span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">
            Dunya henuz hazir degil
          </h2>
          <p className="mx-auto mt-2 max-w-[34rem] text-sm leading-6 text-on-surface-variant">
            {character.name} icin karakter kaydi var ama dunya bootstrap'i
            tamamlanmamis. Haritayi kullanabilmek icin dunya olusturmayi tekrar
            deneyebiliriz.
          </p>
          {repairError ? (
            <div className="mx-auto mt-4 max-w-[30rem] rounded-xl border border-error-container bg-white px-4 py-3 text-sm text-error">
              {repairError}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void repairWorld()}
              disabled={repairingWorld}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              {repairingWorld
                ? "Dunya hazirlaniyor..."
                : "Dunyayi tekrar hazirla"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Haritayi Incele
          </h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            {character.name} icin gorunur bolgeler, acik yollar ve su anki
            konum.
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface">
          <p className="font-semibold">Dunya durumu</p>
          <p className="mt-1 text-on-surface-variant">
            {world.lifecycleStatus}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          {world.regions.map((region) => (
            <article
              key={region.id}
              className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-on-surface">
                      {region.displayName}
                    </h2>
                    {region.isCurrentRegion ? (
                      <span className="rounded-full bg-primary-fixed px-2 py-1 text-xs font-semibold text-primary">
                        Su an burada
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {region.summary}
                  </p>
                </div>
                <div className="text-sm text-on-surface-variant">
                  <p>Kesif: {region.discoveryStatus}</p>
                  <p className="mt-1">Erisim: {region.accessibilityStatus}</p>
                </div>
              </div>

              {region.locations.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {region.locations.map((location) => {
                    const isSelected = location.id === selectedLocationId;

                    return (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => setSelectedLocationId(location.id)}
                        className={[
                          "rounded-lg border bg-white p-4 text-left transition",
                          isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-outline-variant hover:border-primary/40",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-on-surface">
                              {location.displayName}
                            </h3>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {location.locationType}
                            </p>
                          </div>
                          {location.isCurrent ? (
                            <span className="rounded-full bg-secondary-fixed px-2 py-1 text-xs font-semibold text-secondary">
                              Konum
                            </span>
                          ) : location.isHome ? (
                            <span className="rounded-full bg-tertiary-fixed px-2 py-1 text-xs font-semibold text-tertiary">
                              Yuva
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                          {location.accessibilityHint}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
                          <span>Guvenlik: {location.safetyLevel}</span>
                          <span>{isSelected ? "Secili" : "Ayrinti"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-on-surface-variant">
                  Bu bolge icin daha fazla ayrinti henuz gorunmuyor.
                </p>
              )}
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-outline-variant bg-white p-5">
            <h2 className="text-lg font-bold text-on-surface">Harita ozeti</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <SummaryTile label="Karakter" value={character.name} />
              <SummaryTile
                label="Rol"
                value={`${character.characterType} / ${character.subtype}`}
              />
              <SummaryTile
                label="Su anki konum"
                value={world.currentLocation?.displayName ?? "Bilinmiyor"}
              />
              <SummaryTile
                label="Gorunen bolge"
                value={String(discoveredRegions.length)}
              />
              <SummaryTile
                label="Canta"
                value={inventoryCount > 0 ? `${inventoryCount} esya` : "Bos"}
              />
              <SummaryTile
                label="Son checkpoint"
                value={world.latestCheckpointId ? "Hazir" : "Yok"}
              />
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-5">
            <h2 className="text-lg font-bold text-on-surface">
              Konum ayrintisi
            </h2>
            {selectedLocation && selectedRegion ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    {selectedLocation.displayName}
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {selectedRegion.displayName} icinde bir{" "}
                    {selectedLocation.locationType}.
                  </p>
                </div>
                <DetailRow
                  label="Erisim"
                  value={selectedLocation.accessibilityStatus}
                />
                <DetailRow
                  label="Guvenlik"
                  value={selectedLocation.safetyLevel}
                />
                <DetailRow
                  label="Durum"
                  value={
                    selectedLocation.isCurrent
                      ? "Karakter burada"
                      : selectedLocation.isHome
                        ? "Yuva noktasi"
                        : "Gorunur nokta"
                  }
                />
                <p className="rounded-lg bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
                  {selectedLocation.accessibilityHint}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Gorunen bir konum secildiginde burada daha net bir ozet gorunur.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-5">
            <h2 className="text-lg font-bold text-on-surface">Canta ozeti</h2>
            {inventoryPreview.length > 0 ? (
              <div className="mt-4 space-y-3">
                {inventoryPreview.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-on-surface">
                        {item.displayName}
                      </p>
                      <span className="text-xs text-on-surface-variant">
                        x{item.quantity}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {item.category} / {item.rarity} / {item.conditionStatus}
                    </p>
                  </div>
                ))}
                {inventory.length > inventoryPreview.length ? (
                  <p className="text-xs text-on-surface-variant">
                    +{inventory.length - inventoryPreview.length} esya daha
                    gorunuyor.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Karakterin gorunen bir esyasi henuz kaydedilmedi.
              </p>
            )}
          </section>

          <section
            className="rounded-xl border border-outline-variant bg-white p-5"
            data-testid="npc-relationship-summary"
          >
            <h2 className="text-lg font-bold text-on-surface">
              Tanıdıklar ve ilişkiler
            </h2>
            {world.npcs.length > 0 ? (
              <div className="mt-4 space-y-3">
                {world.npcs.map((npc) => (
                  <article
                    className="rounded-lg border border-outline-variant bg-surface-container-low p-4"
                    data-testid="npc-state-card"
                    key={npc.key}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">
                          {npc.name}
                        </h3>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {npc.subtype} · {npc.locationName}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary-fixed/60 px-2.5 py-1 text-xs font-bold text-primary">
                        {npc.relationshipLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                      {npc.originConcept}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs text-on-surface-variant">
                      <p>Yakınlık: {npc.relationshipToCharacter.toFixed(2)}</p>
                      <p>
                        İhtiyaçlar:{" "}
                        {npc.needTypes.length > 0
                          ? npc.needTypes.join(", ")
                          : "kayıtlı ihtiyaç yok"}
                      </p>
                      <p>Son etkileşim: {npc.lastInteractionAt}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Bu dünyada henüz görünür bir NPC ilişkisi kaydedilmedi.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-5">
            <h2 className="text-lg font-bold text-on-surface">Kesif notu</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Harita yalnizca gorunur ve guvenli sekilde acilmis bilgileri
              gosterir. Kilitli ya da henuz kesfedilmemis alanlar spoiler
              vermeden ozetlenir.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
        {label}
      </span>
      <span className="text-sm font-semibold text-on-surface">{value}</span>
    </div>
  );
}
