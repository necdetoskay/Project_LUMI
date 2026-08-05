"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ArchetypeSuggestion = {
  id: string;
  canonicalType: string;
  title: string;
  description: string;
  personalityHook: string;
  storyPromise: string;
  themeTags: string[];
};

type OriginPackage = {
  id: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  originConcept: string;
  startingRegionArchetype?: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed?: string;
  firstMysterySeed?: string;
  toneVector?: string[];
  noveltyMarkers?: string[];
  originMode: string;
  universeSeed: string;
  generationBatchId?: string;
  generationSource?: string;
  modelId?: string;
  accepted?: boolean;
  payload?: {
    originConcept: string;
    startingRegionArchetype: string;
    startingLocation: string;
    homeArchetype: string;
    nearbyNpcSeed: string;
    firstMysterySeed: string;
    toneVector: string[];
    noveltyMarkers: string[];
  };
};

type Step = 1 | 2 | 3;

type GenerationSourceInfo = {
  generationSource: "llm" | "llm_config_error" | "llm_error";
  modelId: string | null;
  fallbackReason: string | null;
};

type BootstrapStatusResponse = {
  status?: {
    latestHandoff: {
      id: string;
    } | null;
    handoffConsumed: boolean;
    character: {
      id: string;
      name: string;
    } | null;
    originPackageCount: number;
  };
  message?: string;
};

export default function CharacterOnboardingClientPage() {
  const [step, setStep] = useState<Step>(1);
  const [childProfileId, setChildProfileId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [handoffId, setHandoffId] = useState<string | null>(null);
  const [originMode, setOriginMode] = useState<"auto" | "manual">("auto");

  const [archetypes, setArchetypes] = useState<ArchetypeSuggestion[]>([]);
  const [archetypeModelId, setArchetypeModelId] = useState<string | null>(null);
  const [archetypeBatchId, setArchetypeBatchId] = useState<string | null>(null);
  const [selectedArchetype, setSelectedArchetype] =
    useState<ArchetypeSuggestion | null>(null);
  const [archetypesLoading, setArchetypesLoading] = useState<boolean>(false);
  const [archetypesError, setArchetypesError] = useState<string | null>(null);

  const [packages, setPackages] = useState<OriginPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [nameOverride, setNameOverride] = useState<string>("");
  const [subtypeOverride, setSubtypeOverride] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapDone, setBootstrapDone] = useState<boolean>(false);
  const [createdCharacter, setCreatedCharacter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [existingCharacter, setExistingCharacter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [genSource, setGenSource] = useState<GenerationSourceInfo | null>(null);

  const loadBootstrapStatus = useCallback(
    async (nextHouseholdId: string, nextChildProfileId: string) => {
      try {
        const res = await fetch(
          `/api/character-bootstrap/status?householdId=${encodeURIComponent(nextHouseholdId)}&childProfileId=${encodeURIComponent(nextChildProfileId)}`,
        );
        const data = (await res.json()) as BootstrapStatusResponse;
        if (!res.ok) {
          return null;
        }

        const status = data.status ?? null;
        if (status?.latestHandoff?.id) {
          setHandoffId(status.latestHandoff.id);
        }
        if (status?.character) {
          setExistingCharacter({
            id: status.character.id,
            name: status.character.name,
          });
        } else {
          setExistingCharacter(null);
        }

        return status;
      } catch {
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profile = params.get("childProfileId");
    if (profile) {
      setChildProfileId(profile);
    } else {
      setError("Onboarding baslatmak icin bir cocuk profili secin.");
    }

    fetch("/api/onboarding")
      .then((r) => r.json())
      .then(async (data) => {
        const s = data.onboarding as {
          hasHousehold: boolean;
          householdId: string | null;
        };
        if (!s.hasHousehold || !s.householdId) {
          setError("Oncesinde kurulum akisina geri donun.");
          setLoading(false);
          return;
        }
        setHouseholdId(s.householdId);
        if (profile) {
          await loadBootstrapStatus(s.householdId, profile);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Hane bilgisi yuklenemedi");
        setLoading(false);
      });
  }, [loadBootstrapStatus]);

  const loadArchetypes = useCallback(async () => {
    if (!householdId || !childProfileId || existingCharacter) return;
    setArchetypesLoading(true);
    setArchetypesError(null);
    setSelectedArchetype(null);
    try {
      const res = await fetch("/api/character-bootstrap/generate-archetypes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.fallbackReason ?? data.message ?? "Arketipler üretilemedi";
        setArchetypesError(msg);
        return;
      }
      setArchetypes(data.archetypes as ArchetypeSuggestion[]);
      setArchetypeModelId(data.modelId as string);
      setArchetypeBatchId(data.batchId as string);
    } catch {
      setArchetypesError("Arketipler yüklenemedi");
    } finally {
      setArchetypesLoading(false);
    }
  }, [householdId, childProfileId, existingCharacter]);

  const regenerateArchetypes = useCallback(async () => {
    if (!householdId || !childProfileId || existingCharacter) return;
    setArchetypesLoading(true);
    setArchetypesError(null);
    setSelectedArchetype(null);
    try {
      const excludedConcepts = archetypes.map((a) => ({
        title: a.title,
        description: a.description,
        personalityHook: a.personalityHook,
        storyPromise: a.storyPromise,
      }));
      const res = await fetch("/api/character-bootstrap/generate-archetypes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
          excludedConcepts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.fallbackReason ??
          data.message ??
          "Arketipler yeniden üretilemedi";
        setArchetypesError(msg);
        return;
      }
      setArchetypes(data.archetypes as ArchetypeSuggestion[]);
      setArchetypeModelId(data.modelId as string);
      setArchetypeBatchId(data.batchId as string);
    } catch {
      setArchetypesError("Arketipler yüklenemedi");
    } finally {
      setArchetypesLoading(false);
    }
  }, [householdId, childProfileId, archetypes, existingCharacter]);

  useEffect(() => {
    if (
      step === 1 &&
      householdId &&
      childProfileId &&
      archetypes.length === 0 &&
      !archetypesLoading &&
      !archetypesError
    ) {
      loadArchetypes();
    }
  }, [
    step,
    householdId,
    childProfileId,
    archetypes.length,
    archetypesLoading,
    archetypesError,
    loadArchetypes,
  ]);

  const createHandoff = useCallback(async () => {
    if (
      !householdId ||
      !childProfileId ||
      !selectedArchetype ||
      !archetypeBatchId
    )
      return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/character-bootstrap/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
          characterType: selectedArchetype.canonicalType,
          originMode,
          archetypeBatchId,
          archetypeId: selectedArchetype.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (
          res.status === 409 &&
          (data.error === "HANDOFF_ALREADY_CONSUMED" ||
            data.error === "CHARACTER_ALREADY_EXISTS")
        ) {
          await loadBootstrapStatus(householdId, childProfileId);
        }
        setError(
          data.message ??
            "Bu profil icin karakter akisi zaten tamamlanmis gorunuyor.",
        );
        return;
      }
      setHandoffId(data.handoff.id);
      setStep(2);
    } catch {
      setError("Handoff isteği başarısız oldu");
    } finally {
      setSubmitting(false);
    }
  }, [
    householdId,
    childProfileId,
    selectedArchetype,
    archetypeBatchId,
    originMode,
    loadBootstrapStatus,
  ]);

  const selectedPkg = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );

  const generatePackages = useCallback(async () => {
    if (!householdId || !childProfileId || existingCharacter) return;
    setSubmitting(true);
    setError(null);
    setGenSource(null);
    setPackages([]);
    try {
      const res = await fetch("/api/character-bootstrap/generate-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (
          data.generationSource === "llm_config_error" ||
          data.generationSource === "llm_error"
        ) {
          setGenSource({
            generationSource: data.generationSource as
              | "llm_config_error"
              | "llm_error",
            modelId: null,
            fallbackReason: data.fallbackReason ?? "Bilinmeyen hata",
          });
          return;
        }
        setError(data.message ?? "Öneriler üretilmedi");
        return;
      }
      setGenSource({
        generationSource: data.generationSource as "llm",
        modelId: data.modelId ?? null,
        fallbackReason: null,
      });
      setPackages(data.packages as OriginPackage[]);
      const pkgList = data.packages as OriginPackage[];
      if (pkgList.length > 0) {
        const first = pkgList[0];
        if (first) setSelectedPackageId(first.id);
      }
    } catch {
      setError("Öneriler oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }, [householdId, childProfileId, existingCharacter]);

  const confirmSelection = useCallback(() => {
    if (!selectedPkg) {
      setError("Önce bir öneri seçin");
      return;
    }
    setStep(3);
  }, [selectedPkg]);

  const createCharacter = useCallback(async () => {
    if (!householdId || !childProfileId || !handoffId || !selectedPackageId)
      return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/character-bootstrap/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
          handoffId,
          originPackageId: selectedPackageId,
          manualOverrides: {
            name: nameOverride.trim() || undefined,
            subtype: subtypeOverride.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          await loadBootstrapStatus(householdId, childProfileId);
        }
        setError(
          data.message ??
            "Karakter olusturulamadi. Mevcut karakter acilabilir.",
        );
        return;
      }
      setBootstrapDone(true);
      setCreatedCharacter({
        id: data.character.id,
        name: data.character.name,
      });
      window.location.href = `/app/profiles/${encodeURIComponent(childProfileId)}/characters/${encodeURIComponent(data.character.id)}`;
    } catch {
      setError("Karakter oluşturma başarısız oldu");
    } finally {
      setSubmitting(false);
    }
  }, [
    householdId,
    childProfileId,
    handoffId,
    selectedPackageId,
    nameOverride,
    subtypeOverride,
    loadBootstrapStatus,
  ]);

  if (loading) return <Shell>Yukleniyor...</Shell>;
  if (existingCharacter && childProfileId) {
    return (
      <Shell>
        <div className="rounded-2xl border border-outline-variant bg-white p-8">
          <h1 className="text-2xl font-bold text-on-surface">
            Bu profil icin karakter zaten olusturulmus
          </h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Yeni karakter baslatmak yerine mevcut karaktere donuyoruz. Sorun
            dunya tarafindaysa onu mevcut karakter uzerinden onaracagiz.
          </p>
          {error ? (
            <div className="mt-4 rounded-xl border border-error-container bg-white px-4 py-3 text-sm text-error">
              {error}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-[#4c29cf]"
              href={`/app/profiles/${encodeURIComponent(childProfileId)}/characters/${encodeURIComponent(existingCharacter.id)}`}
            >
              Karakter detayini ac
            </a>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              href={`/app/profiles/${encodeURIComponent(childProfileId)}/world?characterId=${encodeURIComponent(existingCharacter.id)}`}
            >
              Dunyayi kontrol et
            </a>
          </div>
        </div>
      </Shell>
    );
  }
  if (!childProfileId || !householdId || error) {
    return (
      <Shell>
        <div className="rounded-2xl border border-error-container bg-white px-6 py-8 text-error">
          {error ?? "Eksik parametre"}
          <div className="mt-4">
            <a
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-[#4c29cf]"
              href="/app/profiles"
            >
              Profillere don
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  if (bootstrapDone && createdCharacter) {
    return (
      <Shell>
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
            Karakterin hazır!
          </h1>
          <p className="mt-3 text-on-surface-variant">
            {createdCharacter.name} adlı karakteriniz için ilk maceralara
            hazırsınız.
          </p>
        </header>
        <div className="rounded-2xl border border-outline-variant bg-white p-8">
          <p className="text-base text-on-surface">
            Karakter başlangıcı başarıyla tamamlandı.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm hover:bg-[#4c29cf]"
              href="/app/profiles"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Profillere don
            </a>
            <a
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-white px-5 text-sm font-semibold text-on-surface hover:bg-surface-container"
              href={`/app/profiles/${encodeURIComponent(childProfileId)}`}
            >
              Profile git
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-8 flex flex-col gap-2">
        <nav className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
          <a className="transition-colors hover:text-primary" href="/app">
            Dashboard
          </a>
          <span className="material-symbols-outlined text-sm">
            chevron_right
          </span>
          <a
            className="transition-colors hover:text-primary"
            href="/app/profiles"
          >
            Profiller
          </a>
          <span className="material-symbols-outlined text-sm">
            chevron_right
          </span>
          <span className="text-primary">Karakter Başlangıcı</span>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
          Karakter Başlangıç Akışı
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Adım 1: arketip seç &mdash; Adım 2: önerileri incele &mdash; Adım 3:
          onayla
        </p>
        <div className="mt-4 flex items-center gap-2">
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className={`h-2 flex-1 rounded-full ${
                step >= n ? "bg-primary" : "bg-outline-variant"
              }`}
            />
          ))}
        </div>
      </header>

      {step === 1 && (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-white p-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-on-surface">
                Karakter arketipi seç
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Yapay zeka ile size özel 5 farklı karakter arketipi oluşturuldu.
              </p>
              {archetypeModelId && (
                <p className="mt-1 text-xs font-semibold text-primary">
                  AI önerileri: {archetypeModelId}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={regenerateArchetypes}
              data-testid="regenerate-archetypes"
              disabled={archetypesLoading}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              {archetypesLoading ? "Oluşturuluyor" : "Yeniden üret"}
            </button>
          </div>

          {archetypesLoading && (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-white px-8 py-16 text-center text-on-surface-variant">
              AI arketipler oluşturuluyor...
            </div>
          )}

          {archetypesError && (
            <div className="rounded-2xl border border-error-container bg-error-fixed/10 px-5 py-4 text-sm text-error">
              <span className="font-semibold">
                AI arketip oluşturma başarısız oldu:
              </span>{" "}
              {archetypesError}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={loadArchetypes}
                  className="underline hover:no-underline"
                >
                  Tekrar dene
                </button>
                <span className="mx-2">veya</span>
                <a
                  href="/app/settings"
                  className="underline hover:no-underline"
                >
                  Ayarlar üzerinden OpenRouter AI bağlantısını yapılandırın.
                </a>
              </div>
            </div>
          )}

          {!archetypesLoading && !archetypesError && archetypes.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {archetypes.map((a) => (
                  <button
                    key={a.canonicalType}
                    data-testid="archetype-card"
                    type="button"
                    onClick={() => setSelectedArchetype(a)}
                    className={`text-left rounded-2xl border p-5 transition-colors ${
                      selectedArchetype?.canonicalType === a.canonicalType
                        ? "border-primary bg-primary-fixed/40 ring-2 ring-primary/40"
                        : "border-outline-variant bg-white hover:bg-surface-container-low"
                    }`}
                  >
                    <span className="inline-flex items-center rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {a.canonicalType}
                    </span>
                    <p className="mt-3 text-lg font-bold text-on-surface">
                      {a.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {a.description}
                    </p>
                    <p className="mt-2 text-xs italic text-on-surface-variant">
                      {a.storyPromise}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {a.themeTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-surface-container-low px-2 py-0.5 text-xs text-on-surface-variant"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-white p-6">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-on-surface-variant">
                    Oluşturma modu
                  </label>
                  <div className="mt-2 flex gap-3">
                    {(["auto", "manual"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setOriginMode(m)}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                          originMode === m
                            ? "border-primary bg-primary-fixed/50 text-primary"
                            : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                        }`}
                      >
                        {m === "auto" ? "Otomatik (4 öneri)" : "Elle (1 öneri)"}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createHandoff}
                  data-testid="use-archetype"
                  disabled={!selectedArchetype || submitting}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf] disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                  {submitting ? "Devam ediliyor" : "Bu arketipi kullan"}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-white p-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-on-surface">
                Origin önerileri
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Seçilen arketip:{" "}
                {selectedArchetype?.title ??
                  selectedArchetype?.canonicalType ??
                  "-"}
                &mdash; Mod: {originMode}
              </p>
              {genSource?.generationSource === "llm" && genSource.modelId && (
                <p className="mt-1 text-xs font-semibold text-primary">
                  AI önerileri: {genSource.modelId}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={generatePackages}
              data-testid="generate-origin-packages"
              disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">
                auto_awesome
              </span>
              {submitting
                ? "Üretiliyor"
                : packages.length > 0
                  ? "Yeniden üret"
                  : "Önerileri üret"}
            </button>
          </div>

          {genSource?.generationSource === "llm_config_error" && (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
              <span className="font-semibold">AI yapılandırma hatası:</span>{" "}
              {genSource.fallbackReason ?? "Bilinmeyen neden"}
              <div className="mt-1">
                <a
                  href="/app/settings"
                  className="underline hover:no-underline"
                >
                  Ayarlar üzerinden OpenRouter AI bağlantısını yapılandırın.
                </a>
              </div>
            </div>
          )}

          {genSource?.generationSource === "llm_error" && (
            <div
              data-testid="origin-generation-error"
              className="rounded-2xl border border-error-container bg-error-fixed/10 px-5 py-4 text-sm text-error"
            >
              <span className="font-semibold">AI önerisi başarısız oldu:</span>{" "}
              {genSource.fallbackReason ?? "Bilinmeyen hata"}
            </div>
          )}

          {packages.length === 0 &&
          genSource?.generationSource !== "llm_config_error" &&
          genSource?.generationSource !== "llm_error" ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-white px-8 py-16 text-center text-on-surface-variant">
              Henüz öneri üretilmedi. Yukarıdaki butonu kullanarak ilk adımı
              başlatın.
            </div>
          ) : packages.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {packages.map((p) => {
                  const concept =
                    p.originConcept ?? p.payload?.originConcept ?? "";
                  const home =
                    p.homeArchetype ?? p.payload?.homeArchetype ?? "";
                  const location =
                    p.startingLocation ?? p.payload?.startingLocation ?? "";
                  return (
                    <button
                      key={p.id}
                      data-testid="origin-package-card"
                      type="button"
                      onClick={() => setSelectedPackageId(p.id)}
                      className={`text-left rounded-2xl border p-5 transition-colors ${
                        selectedPackageId === p.id
                          ? "border-primary bg-primary-fixed/40 ring-2 ring-primary/40"
                          : "border-outline-variant bg-white hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                          {p.broadKind}
                        </span>
                        <span className="text-xs font-semibold text-on-surface-variant">
                          {p.originMode}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-on-surface">
                        {p.subtype}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant line-clamp-4">
                        {concept}
                      </p>
                      <div className="mt-4 space-y-1 text-xs text-on-surface-variant">
                        <p>
                          Bolge: {p.payload?.startingRegionArchetype ?? "-"}
                        </p>
                        <p>Yer: {location}</p>
                        <p>Ev: {home}</p>
                      </div>
                      {p.generationSource === "llm" && (
                        <p className="mt-2 text-xs text-primary">
                          AI üretimi{p.modelId ? ` (${p.modelId})` : ""}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-white px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={confirmSelection}
                  disabled={!selectedPackageId}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf] disabled:opacity-60"
                >
                  Seçimi onayla ve özelleştir
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </>
          ) : null}
        </section>
      )}

      {step === 3 && selectedPkg && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-xl font-bold text-on-surface">
              Seçilen öneri: {selectedPkg.subtype}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              İsterseniz ad ve alt türü özelleştirebilir, geri kalan alanları
              önerideki gibi bırakabilirsiniz.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-on-surface-variant">
                  Karakter adı
                </span>
                <input
                  type="text"
                  value={nameOverride}
                  onChange={(e) => setNameOverride(e.target.value)}
                  placeholder="Öneri otomatik atanır"
                  maxLength={120}
                  className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-on-surface-variant">
                  Alt tür (görünen karakter tarzı)
                </span>
                <input
                  type="text"
                  value={subtypeOverride}
                  onChange={(e) => setSubtypeOverride(e.target.value)}
                  placeholder={selectedPkg.subtype}
                  maxLength={80}
                  className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface lg:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                  Konsept
                </p>
                <p className="mt-1 leading-6">
                  {selectedPkg.originConcept ??
                    selectedPkg.payload?.originConcept}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                  Ev
                </p>
                <p className="mt-1">
                  {selectedPkg.homeArchetype ??
                    selectedPkg.payload?.homeArchetype}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                  Universe seed
                </p>
                <p className="mt-1 break-all">{selectedPkg.universeSeed}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-white px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
            >
              Geri
            </button>
            <button
              type="button"
              onClick={createCharacter}
              disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">
                check
              </span>
              {submitting
                ? "Karakter kaydediliyor"
                : "Karakteri oluştur ve handoff'u tüket"}
            </button>
          </div>
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col px-6 py-10 text-on-surface">
      {children}
    </main>
  );
}
