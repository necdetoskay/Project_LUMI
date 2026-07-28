"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const CHARACTER_TYPES: Array<{
  value: string;
  label: string;
  desc: string;
}> = [
  { value: "explorer", label: "Kasif", desc: "Yeni yerler kesfeden, haritaci bir ruh" },
  { value: "inventor", label: "Mucit", desc: "Sorunlara cozum ureten, tasarimci" },
  { value: "storyteller", label: "Hikayeci", desc: "Masallar ureten, soz ustasi" },
  { value: "helper", label: "Yardimci", desc: "Cevresini destekleyen, korumaci" },
  { value: "dreamer", label: "Ruyaci", desc: "Renkli dunyalar yaratan, yaratici" },
];

const ORIGIN_MODES: Array<{ value: "auto" | "manual"; label: string; desc: string }> = [
  { value: "auto", label: "Otomatik", desc: "Sistem 4 oneriden secim yapmanizi sunar" },
  { value: "manual", label: "Elle", desc: "Sadece 1 oneri sunulur; siz ozellestirirsiniz" },
];

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

export default function CharacterOnboardingClientPage() {
  const [step, setStep] = useState<Step>(1);
  const [childProfileId, setChildProfileId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [handoffId, setHandoffId] = useState<string | null>(null);
  const [characterType, setCharacterType] = useState<string>("explorer");
  const [originMode, setOriginMode] = useState<"auto" | "manual">("auto");
  const [packages, setPackages] = useState<OriginPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
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
      .then((data) => {
        const s = data.onboarding as {
          hasHousehold: boolean;
          householdId: string | null;
        };
        if (!s.hasHousehold || !s.householdId) {
          setError("Oncesinde kurulum akisini tamamlayin.");
          setLoading(false);
          return;
        }
        setHouseholdId(s.householdId);
        setLoading(false);
      })
      .catch(() => {
        setError("Hane bilgisi yuklenemedi");
        setLoading(false);
      });
  }, []);

  const selectedPkg = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );

  const createHandoff = useCallback(async () => {
    if (!householdId || !childProfileId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/character-bootstrap/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
          characterType,
          originMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Handoff olusturulamadi");
        return;
      }
      setHandoffId(data.handoff.id);
      setStep(2);
    } catch {
      setError("Handoff istegi basarisiz oldu");
    } finally {
      setSubmitting(false);
    }
  }, [householdId, childProfileId, characterType, originMode]);

  const generatePackages = useCallback(async () => {
    if (!householdId || !childProfileId) return;
    setSubmitting(true);
    setError(null);
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
        setError(data.message ?? "Oneriler uretilmedi");
        return;
      }
      setPackages(data.packages as OriginPackage[]);
      const pkgList = data.packages as OriginPackage[];
      if (pkgList.length > 0) {
        const first = pkgList[0];
        if (first) setSelectedPackageId(first.id);
      }
    } catch {
      setError("Oneriler olusturulamadi");
    } finally {
      setSubmitting(false);
    }
  }, [householdId, childProfileId]);

  const confirmSelection = useCallback(() => {
    if (!selectedPkg) {
      setError("Once bir oneri secin");
      return;
    }
    setStep(3);
  }, [selectedPkg]);

  const createCharacter = useCallback(async () => {
    if (!householdId || !childProfileId || !handoffId || !selectedPackageId) return;
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
        setError(data.message ?? "Karakter olusturulamadi");
        return;
      }
      setBootstrapDone(true);
      setCreatedCharacter({
        id: data.character.id,
        name: data.character.name,
      });
    } catch {
      setError("Karakter olusturma basarisiz oldu");
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
  ]);

  if (loading) return <Shell>Yukleniyor...</Shell>;
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
            Karakterin hazir!
          </h1>
          <p className="mt-3 text-on-surface-variant">
            {createdCharacter.name} adli karakteriniz icin ilk maceralara hazirsiniz.
          </p>
        </header>
        <div className="rounded-2xl border border-outline-variant bg-white p-8">
          <p className="text-base text-on-surface">
            Karakter baslangici basariyla tamamlandi. Handoff kaydi tuketildi ve domain kaydi
            olusturuldu.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm hover:bg-[#4c29cf]"
              href="/app/profiles"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Profillere don
            </a>
            <a
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-white px-5 text-sm font-semibold text-on-surface hover:bg-surface-container"
              href="/app"
            >
              Ana sayfaya git
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
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <a className="transition-colors hover:text-primary" href="/app/profiles">
            Profiller
          </a>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-primary">Karakter Baslangici</span>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
          Karakter baslangic akisi
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Adim 1: tercihleri belirle &mdash; Adim 2: onerileri incele &mdash; Adim 3: onayla
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
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-xl font-bold text-on-surface">Karakter taini</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Baslamak icin bir karakter taini secin. Tainler, onerilerin tonunu belirler.
            </p>
            <div className="mt-5 space-y-2">
              {CHARACTER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setCharacterType(t.value)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    characterType === t.value
                      ? "border-primary bg-primary-fixed/50 ring-2 ring-primary/40"
                      : "border-outline-variant bg-white hover:bg-surface-container-low"
                  }`}
                >
                  <p className="text-base font-bold text-on-surface">{t.label}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-xl font-bold text-on-surface">Olusturma modu</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Otomatik modda daha fazla secenek sunulur; elle modda adlandirma ve ozellestirme
              size kalmistir.
            </p>
            <div className="mt-5 space-y-2">
              {ORIGIN_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setOriginMode(m.value)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    originMode === m.value
                      ? "border-primary bg-primary-fixed/50 ring-2 ring-primary/40"
                      : "border-outline-variant bg-white hover:bg-surface-container-low"
                  }`}
                >
                  <p className="text-base font-bold text-on-surface">{m.label}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{m.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={createHandoff}
                disabled={submitting}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf] disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                {submitting ? "Handoff olusturuluyor" : "Devam et"}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-white p-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-on-surface">Origin onerileri</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Taban seed: {handoffId?.slice(0, 12)} &mdash; Mod: {originMode} &mdash; Tain:{" "}
                {characterType}
              </p>
            </div>
            <button
              type="button"
              onClick={generatePackages}
              disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-[#4c29cf] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              {submitting
                ? "Uretiliyor"
                : packages.length > 0
                  ? "Yeniden uret"
                  : "Onerileri uret"}
            </button>
          </div>

          {packages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-white px-8 py-16 text-center text-on-surface-variant">
              Henuz oneri uretilmedi. Yukaridaki butonu kullanarak ilk adimi baslatin.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {packages.map((p) => {
                  const concept =
                    p.originConcept ?? p.payload?.originConcept ?? "";
                  const home = p.homeArchetype ?? p.payload?.homeArchetype ?? "";
                  const location =
                    p.startingLocation ?? p.payload?.startingLocation ?? "";
                  return (
                    <button
                      key={p.id}
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
                      <p className="text-lg font-bold text-on-surface">{p.subtype}</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant line-clamp-4">
                        {concept}
                      </p>
                      <div className="mt-4 space-y-1 text-xs text-on-surface-variant">
                        <p>Bolge: {p.payload?.startingRegionArchetype ?? "-"}</p>
                        <p>Yer: {location}</p>
                        <p>Ev: {home}</p>
                      </div>
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
                  Secimi onayla ve ozellestir
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {step === 3 && selectedPkg && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="text-xl font-bold text-on-surface">
              Secilen oneri: {selectedPkg.subtype}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Isterseniz ad ve alt-taini ozellestirebilir, geri kalan alanlari onerideki gibi
              birakabilirsiniz.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-on-surface-variant">
                  Karakter adi
                </span>
                <input
                  type="text"
                  value={nameOverride}
                  onChange={(e) => setNameOverride(e.target.value)}
                  placeholder="Oneri otomatik atanir"
                  maxLength={120}
                  className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-on-surface-variant">
                  Alt tain (subtype)
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
                  {selectedPkg.originConcept ?? selectedPkg.payload?.originConcept}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                  Ev
                </p>
                <p className="mt-1">
                  {selectedPkg.homeArchetype ?? selectedPkg.payload?.homeArchetype}
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
              <span className="material-symbols-outlined text-[18px]">check</span>
              {submitting ? "Karakter kaydediliyor" : "Karakteri olustur ve handoffu tuket"}
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
