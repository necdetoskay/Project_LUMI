"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CharacterResponse = {
  character?: {
    id: string;
    childProfileId: string;
    householdId: string;
    name: string;
    broadKind: string;
    characterType: string;
    subtype: string;
    originMode: string;
    originConcept: string | null;
    startingLocation: string | null;
    homeArchetype: string | null;
    createdAt: string;
  } | null;
  message?: string;
};

type InventoryItem = {
  id: string;
  displayName: string;
  category: string;
  rarity: string;
  quantity: number;
  conditionStatus: string;
};

type OnboardingPayload = {
  onboarding?: {
    householdId: string | null;
  };
};

type WorldResponse = {
  world?: {
    currentLocation: {
      id: string;
      displayName: string;
      locationType: string;
    } | null;
    regions: Array<{
      id: string;
      displayName: string;
      isCurrentRegion: boolean;
      locations: Array<{
        id: string;
        displayName: string;
        isCurrent: boolean;
      }>;
    }>;
  } | null;
};

export function ProfileCharacterDetailSection({
  childProfileId,
  characterId,
}: {
  childProfileId: string;
  characterId: string;
}) {
  const [character, setCharacter] =
    useState<CharacterResponse["character"]>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [world, setWorld] = useState<WorldResponse["world"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const onboardingRes = await fetch("/api/onboarding");
      const onboardingData = (await onboardingRes.json()) as OnboardingPayload;
      const householdId = onboardingData.onboarding?.householdId ?? null;

      if (!householdId) {
        setError("Household bilgisi bulunamadi.");
        setCharacter(null);
        setInventory([]);
        setWorld(null);
        return;
      }

      const characterRes = await fetch(
        `/api/characters/${encodeURIComponent(characterId)}?householdId=${encodeURIComponent(householdId)}`,
      );
      const characterBody = (await characterRes.json()) as CharacterResponse;

      if (!characterRes.ok || !characterBody.character) {
        setError(characterBody.message ?? "Karakter bilgisi yuklenemedi.");
        setCharacter(null);
        setInventory([]);
        setWorld(null);
        return;
      }

      setCharacter(characterBody.character);

      const [inventoryResult, worldResult] = await Promise.allSettled([
        fetch(
          `/api/inventory/list?householdId=${encodeURIComponent(householdId)}&ownerType=character&ownerId=${encodeURIComponent(characterId)}`,
        ),
        fetch(
          `/api/child-profiles/${encodeURIComponent(childProfileId)}/world?householdId=${encodeURIComponent(householdId)}&characterId=${encodeURIComponent(characterId)}`,
        ),
      ]);

      if (inventoryResult.status === "fulfilled" && inventoryResult.value.ok) {
        const inventoryBody = (await inventoryResult.value.json()) as {
          items?: InventoryItem[];
        };
        setInventory(inventoryBody.items ?? []);
      } else {
        setInventory([]);
      }

      if (worldResult.status === "fulfilled" && worldResult.value.ok) {
        const worldBody = (await worldResult.value.json()) as WorldResponse;
        setWorld(worldBody.world ?? null);
      } else {
        setWorld(null);
      }
    } catch {
      setError("Karakter detaylari yuklenirken bir hata olustu.");
      setCharacter(null);
      setInventory([]);
      setWorld(null);
    } finally {
      setLoading(false);
    }
  }, [characterId, childProfileId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const inventoryCount = useMemo(
    () => inventory.reduce((sum, item) => sum + item.quantity, 0),
    [inventory],
  );
  const currentRegion = useMemo(
    () => world?.regions.find((region) => region.isCurrentRegion) ?? null,
    [world],
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <p className="text-sm text-on-surface-variant">
          Karakter yukleniyor...
        </p>
      </section>
    );
  }

  if (error || !character) {
    return (
      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="rounded-xl border border-error-container bg-white px-5 py-4 text-sm text-error">
          {error ?? "Karakter bulunamadi."}
        </div>
      </section>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col px-6 py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-on-surface-variant">
        <a className="transition-colors hover:text-primary" href="/app">
          Dashboard
        </a>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <a
          className="transition-colors hover:text-primary"
          href="/app/profiles"
        >
          Profiller
        </a>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <a
          className="transition-colors hover:text-primary"
          href={`/app/profiles/${encodeURIComponent(childProfileId)}`}
        >
          Profil
        </a>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-primary">{character.name}</span>
      </nav>

      <header className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-tertiary-fixed text-tertiary">
              <span className="material-symbols-outlined text-[32px]">
                sparkles
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                Karakter
              </p>
              <h1 className="mt-2 text-2xl font-extrabold text-on-surface md:text-3xl">
                {character.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-on-surface-variant">
                <Badge text={character.characterType} />
                <Badge text={character.subtype} />
                <Badge text={character.originMode} />
              </div>
              <p className="mt-4 max-w-[42rem] text-sm leading-6 text-on-surface-variant">
                Karakterin kimligini, su anki dunya baglamini ve hikaye
                baslatmak icin kullanilabilecek temel durumu burada
                gorebilirsiniz.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
              href={`/app/profiles/${encodeURIComponent(childProfileId)}/world?characterId=${encodeURIComponent(characterId)}`}
            >
              <span className="material-symbols-outlined text-[18px]">
                travel_explore
              </span>
              Haritayi ac
            </a>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
              href={`/app/profiles/${encodeURIComponent(childProfileId)}`}
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Profile don
            </a>
          </div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-xl font-bold text-on-surface">
              Karakter ozeti
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoTile label="Karakter tipi" value={character.characterType} />
              <InfoTile label="Alt tur" value={character.subtype} />
              <InfoTile
                label="Baslangic"
                value={character.startingLocation ?? "Belirlenmedi"}
              />
              <InfoTile
                label="Yuva"
                value={character.homeArchetype ?? "Belirlenmedi"}
              />
            </div>
            {character.originConcept ? (
              <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                  Origin concept
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface">
                  {character.originConcept}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-xl font-bold text-on-surface">Canta ozeti</h2>
            {inventory.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-outline-variant bg-surface-container-low p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-on-surface">
                        {item.displayName}
                      </p>
                      <span className="text-xs text-on-surface-variant">
                        x{item.quantity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      {item.category} | {item.rarity} | {item.conditionStatus}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                Karaktere bagli gorunen bir esya henuz kaydedilmedi.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-lg font-bold text-on-surface">Dunya durumu</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <InfoTile
                label="Su anki konum"
                value={world?.currentLocation?.displayName ?? "Bilinmiyor"}
              />
              <InfoTile
                label="Bulundugu bolge"
                value={currentRegion?.displayName ?? "Bilinmiyor"}
              />
              <InfoTile
                label="Canta"
                value={inventoryCount > 0 ? `${inventoryCount} esya` : "Bos"}
              />
              <InfoTile
                label="Olusturma"
                value={new Date(character.createdAt).toLocaleDateString(
                  "tr-TR",
                )}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-lg font-bold text-on-surface">
              Siradaki adimlar
            </h2>
            <div className="mt-4 space-y-3">
              <ActionLink
                href={`/app/profiles/${encodeURIComponent(childProfileId)}?tab=stories`}
                title="Hikayelere don"
                description="Bu karakter icin devam eden oturumlari veya yeni hikaye akisini acin."
                icon="menu_book"
              />
              <ActionLink
                href={`/app/profiles/${encodeURIComponent(childProfileId)}/world?characterId=${encodeURIComponent(characterId)}`}
                title="Dunyayi incele"
                description="Konum, gorunen bolgeler ve kesif durumunu kontrol edin."
                icon="map"
              />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-surface-container-low px-3 py-1 text-sm text-on-surface-variant">
      {text}
    </span>
  );
}

function ActionLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <a
      className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4 transition-colors hover:border-primary/30 hover:bg-white"
      href={href}
    >
      <span className="material-symbols-outlined text-[20px] text-primary">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          {description}
        </p>
      </div>
    </a>
  );
}
