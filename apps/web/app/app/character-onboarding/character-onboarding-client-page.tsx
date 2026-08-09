"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CharacterIdea = {
  id: string;
  canonicalType: string;
  title: string;
  description: string;
  personalityHook: string;
  storyPromise: string;
  themeTags: string[];
};

type BeginningOption = {
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
};

type Step = 1 | 2 | 3;

type BootstrapStatusResponse = {
  status?: {
    latestHandoff: { id: string } | null;
    handoffConsumed: boolean;
    character: { id: string; name: string } | null;
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
  const [ideas, setIdeas] = useState<CharacterIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<CharacterIdea | null>(null);
  const [ideaBatchId, setIdeaBatchId] = useState<string | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [beginnings, setBeginnings] = useState<BeginningOption[]>([]);
  const [selectedBeginningId, setSelectedBeginningId] = useState<string | null>(null);
  const [nameOverride, setNameOverride] = useState("");
  const [subtypeOverride, setSubtypeOverride] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCharacter, setExistingCharacter] = useState<{ id: string; name: string } | null>(null);

  const selectedBeginning = useMemo(
    () => beginnings.find((item) => item.id === selectedBeginningId) ?? null,
    [beginnings, selectedBeginningId],
  );

  const loadBootstrapStatus = useCallback(async (nextHouseholdId: string, nextChildProfileId: string) => {
    try {
      const response = await fetch(
        `/api/character-bootstrap/status?householdId=${encodeURIComponent(nextHouseholdId)}&childProfileId=${encodeURIComponent(nextChildProfileId)}`,
      );
      const data = (await response.json()) as BootstrapStatusResponse;
      if (!response.ok) return null;
      if (data.status?.latestHandoff?.id) setHandoffId(data.status.latestHandoff.id);
      setExistingCharacter(data.status?.character ?? null);
      return data.status ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profileId = params.get("childProfileId");
    if (!profileId) setError("Karakter oluşturmak için önce bir çocuk profili seçin.");
    else setChildProfileId(profileId);

    fetch("/api/onboarding")
      .then((response) => response.json())
      .then(async (data) => {
        const onboarding = data.onboarding as { hasHousehold: boolean; householdId: string | null };
        if (!onboarding.hasHousehold || !onboarding.householdId) {
          setError("Önce aile alanınızı ve çocuk profilini hazırlayın.");
          setLoading(false);
          return;
        }
        setHouseholdId(onboarding.householdId);
        if (profileId) await loadBootstrapStatus(onboarding.householdId, profileId);
        setLoading(false);
      })
      .catch(() => {
        setError("Aile bilgileri şu anda yüklenemedi.");
        setLoading(false);
      });
  }, [loadBootstrapStatus]);

  const loadIdeas = useCallback(async (excludeCurrent = false) => {
    if (!householdId || !childProfileId || existingCharacter) return;
    setIdeasLoading(true);
    setIdeasError(null);
    setSelectedIdea(null);
    try {
      const response = await fetch("/api/character-bootstrap/generate-archetypes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
          ...(excludeCurrent
            ? {
                excludedConcepts: ideas.map((idea) => ({
                  title: idea.title,
                  description: idea.description,
                  personalityHook: idea.personalityHook,
                  storyPromise: idea.storyPromise,
                })),
              }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setIdeasError("Yeni karakter fikirleri hazırlanamadı. Biraz sonra tekrar deneyin.");
        return;
      }
      setIdeas(data.archetypes as CharacterIdea[]);
      setIdeaBatchId(data.batchId as string);
    } catch {
      setIdeasError("Yeni karakter fikirleri şu anda yüklenemedi.");
    } finally {
      setIdeasLoading(false);
    }
  }, [householdId, childProfileId, existingCharacter, ideas]);

  useEffect(() => {
    if (step === 1 && householdId && childProfileId && ideas.length === 0 && !ideasLoading && !ideasError) {
      void loadIdeas(false);
    }
  }, [step, householdId, childProfileId, ideas.length, ideasLoading, ideasError, loadIdeas]);

  const continueWithIdea = useCallback(async () => {
    if (!householdId || !childProfileId || !selectedIdea || !ideaBatchId) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/character-bootstrap/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
          characterType: selectedIdea.canonicalType,
          originMode,
          archetypeBatchId: ideaBatchId,
          archetypeId: selectedIdea.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) await loadBootstrapStatus(householdId, childProfileId);
        setError("Bu profil için karakter yolculuğu daha önce başlamış olabilir.");
        return;
      }
      setHandoffId(data.handoff.id);
      setStep(2);
    } catch {
      setError("Karakter fikrine devam edilemedi.");
    } finally {
      setSubmitting(false);
    }
  }, [householdId, childProfileId, selectedIdea, ideaBatchId, originMode, loadBootstrapStatus]);

  const generateBeginnings = useCallback(async () => {
    if (!householdId || !childProfileId || existingCharacter) return;
    setSubmitting(true);
    setError(null);
    setBeginnings([]);
    try {
      const response = await fetch("/api/character-bootstrap/generate-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, childProfileId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError("Başlangıç hikâyeleri hazırlanamadı. Biraz sonra tekrar deneyin.");
        return;
      }
      const options = data.packages as BeginningOption[];
      setBeginnings(options);
      setSelectedBeginningId(options[0]?.id ?? null);
    } catch {
      setError("Başlangıç hikâyeleri şu anda oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }, [householdId, childProfileId, existingCharacter]);

  const createCharacter = useCallback(async () => {
    if (!householdId || !childProfileId || !handoffId || !selectedBeginningId) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/character-bootstrap/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          childProfileId,
          handoffId,
          originPackageId: selectedBeginningId,
          manualOverrides: {
            name: nameOverride.trim() || undefined,
            subtype: subtypeOverride.trim() || undefined,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) await loadBootstrapStatus(householdId, childProfileId);
        setError("Karakter tamamlanamadı. Mevcut karakter varsa ona devam edebilirsiniz.");
        return;
      }
      window.location.href = `/app/profiles/${encodeURIComponent(childProfileId)}/characters/${encodeURIComponent(data.character.id)}`;
    } catch {
      setError("Karakter şu anda tamamlanamadı.");
    } finally {
      setSubmitting(false);
    }
  }, [householdId, childProfileId, handoffId, selectedBeginningId, nameOverride, subtypeOverride, loadBootstrapStatus]);

  if (loading) return <StoryShell><p>Karakter fikirleri hazırlanıyor…</p></StoryShell>;

  if (existingCharacter && childProfileId) {
    return (
      <StoryShell>
        <section className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-7 shadow-sm md:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Kaldığınız yer</p>
          <h1 className="mt-2 text-3xl font-extrabold text-on-surface">{existingCharacter.name} sizi bekliyor</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
            Bu çocuk profili için bir karakter zaten var. Yeni bir karakter oluşturmak yerine onun dünyasına ve hikâyelerine devam edebilirsiniz.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="storybook-button" href={`/app/profiles/${encodeURIComponent(childProfileId)}/characters/${encodeURIComponent(existingCharacter.id)}`}>
              Karakteri aç
            </Link>
            <Link className="storybook-button-secondary" href={`/app/profiles/${encodeURIComponent(childProfileId)}/world?characterId=${encodeURIComponent(existingCharacter.id)}`}>
              Dünyasına git
            </Link>
          </div>
        </section>
      </StoryShell>
    );
  }

  if (!childProfileId || !householdId || error) {
    return (
      <StoryShell>
        <section className="rounded-[2rem] border border-error-container bg-white/85 p-7 text-error shadow-sm">
          <p>{error ?? "Eksik profil bilgisi."}</p>
          <Link className="mt-5 inline-flex font-bold underline" href="/app/profiles">Çocuk profillerine dön</Link>
        </section>
      </StoryShell>
    );
  }

  return (
    <StoryShell>
      <header className="mb-8 rounded-[2rem] border border-outline-variant/70 bg-white/80 p-7 shadow-sm md:p-9">
        <Link className="text-sm font-bold text-on-surface-variant hover:text-primary" href="/app/profiles">← Çocuk profillerine dön</Link>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Karakterinle tanış</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface md:text-5xl">
          Bir kahraman seçmiyoruz; birlikte yaşayacağınız bir karakter keşfediyoruz.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-on-surface-variant md:text-lg">
          Birkaç anlamlı seçim yeterli. Karakterin kişiliği, nereden geldiği ve ilk merakı zamanla hikâyelerinizin doğal bir parçasına dönüşecek.
        </p>
        <ol className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Karakter oluşturma adımları">
          {["Karakter fikri", "İlk geçmişi", "Son dokunuşlar"].map((label, index) => {
            const number = index + 1;
            return (
              <li key={label} className={`rounded-2xl border px-4 py-3 text-sm font-bold ${step >= number ? "border-primary/40 bg-primary-fixed/35 text-primary" : "border-outline-variant bg-white/60 text-on-surface-variant"}`}>
                {number}. {label}
              </li>
            );
          })}
        </ol>
      </header>

      {step === 1 ? (
        <section aria-labelledby="idea-heading">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">İlk kıvılcım</p>
              <h2 id="idea-heading" className="mt-2 text-3xl font-extrabold text-on-surface">Hangisi size daha yakın geliyor?</h2>
              <p className="mt-2 max-w-2xl text-on-surface-variant">Hepsini incelemek zorunda değilsiniz. Bir tanesi merak uyandırdıysa onunla başlayın.</p>
            </div>
            <button type="button" className="storybook-button-secondary" disabled={ideasLoading} onClick={() => void loadIdeas(true)}>
              Başka fikirler göster
            </button>
          </div>

          {ideasLoading ? <InfoCard>Yeni karakter fikirleri hazırlanıyor…</InfoCard> : null}
          {ideasError ? <InfoCard>{ideasError}</InfoCard> : null}

          {!ideasLoading && ideas.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {ideas.map((idea) => {
                const selected = selectedIdea?.id === idea.id;
                return (
                  <button
                    key={idea.id}
                    type="button"
                    data-testid="character-idea-card"
                    aria-pressed={selected}
                    onClick={() => setSelectedIdea(idea)}
                    className={`group min-h-[250px] rounded-[1.8rem] border p-6 text-left shadow-sm transition ${selected ? "border-primary bg-primary-fixed/30 ring-2 ring-primary/30" : "border-outline-variant/70 bg-white/85 hover:-translate-y-1"}`}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(145deg,#e4f3e8,#f8e7c8)] text-primary">
                      <span className="material-symbols-outlined text-[28px]" aria-hidden="true">face_6</span>
                    </div>
                    <h3 className="mt-5 text-2xl font-extrabold text-on-surface">{idea.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">{idea.description}</p>
                    <p className="mt-4 text-sm font-semibold leading-6 text-primary">{idea.storyPromise}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {idea.themeTags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-on-surface-variant">{tag}</span>)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-6 rounded-[1.6rem] border border-outline-variant/70 bg-white/80 p-6">
            <p className="text-sm font-bold text-on-surface">Başlangıç çeşitliliği</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">İsterseniz bir sonraki adımda birkaç farklı geçmiş önerisi görebilir ya da daha sade, tek bir başlangıç üzerinden ilerleyebilirsiniz.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setOriginMode("auto")} aria-pressed={originMode === "auto"} className={`rounded-full border px-4 py-2 text-sm font-bold ${originMode === "auto" ? "border-primary bg-primary-fixed/40 text-primary" : "border-outline-variant bg-white"}`}>Birkaç başlangıç öner</button>
              <button type="button" onClick={() => setOriginMode("manual")} aria-pressed={originMode === "manual"} className={`rounded-full border px-4 py-2 text-sm font-bold ${originMode === "manual" ? "border-primary bg-primary-fixed/40 text-primary" : "border-outline-variant bg-white"}`}>Tek ve sade ilerle</button>
            </div>
            <button type="button" data-testid="continue-character-idea" disabled={!selectedIdea || submitting} onClick={() => void continueWithIdea()} className="storybook-button mt-6 disabled:opacity-50">
              Bu karakteri tanımaya devam et
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="origin-heading">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Geçmişinden bir sayfa</p>
          <h2 id="origin-heading" className="mt-2 text-3xl font-extrabold text-on-surface">Bugüne gelmeden önce neler yaşamış olabilir?</h2>
          <p className="mt-3 max-w-3xl text-on-surface-variant">Bu seçim karakterin doğduğu yer, evi, ilk tanışacağı kişiler ve gelecekte büyüyebilecek ilk gizemi için başlangıç canon’unu oluşturur.</p>

          {beginnings.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-outline-variant/70 bg-white/85 p-7 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-fixed text-primary"><span className="material-symbols-outlined text-[30px]" aria-hidden="true">menu_book</span></div>
              <h3 className="mt-5 text-2xl font-extrabold text-on-surface">Başlangıç sayfalarını hazırlayalım</h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">Seçtiğiniz karakter fikrine uygun birkaç farklı geçmiş oluşturulur. Bunlar karakter tamamlanana kadar yalnızca adaydır.</p>
              <button type="button" className="storybook-button mt-6" disabled={submitting} onClick={() => void generateBeginnings()}>{submitting ? "Hazırlanıyor…" : "Başlangıçları göster"}</button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {beginnings.map((item) => {
                const selected = item.id === selectedBeginningId;
                return (
                  <button key={item.id} type="button" data-testid="beginning-card" aria-pressed={selected} onClick={() => setSelectedBeginningId(item.id)} className={`rounded-[1.8rem] border p-6 text-left shadow-sm ${selected ? "border-primary bg-primary-fixed/25 ring-2 ring-primary/30" : "border-outline-variant/70 bg-white/85"}`}>
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Bir başlangıç ihtimali</p>
                    <h3 className="mt-3 text-xl font-extrabold text-on-surface">{item.originConcept}</h3>
                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <Detail label="İlk yer" value={item.startingLocation} />
                      <Detail label="Evi" value={item.homeArchetype} />
                      {item.nearbyNpcSeed ? <Detail label="Yakınındaki biri" value={item.nearbyNpcSeed} /> : null}
                      {item.firstMysterySeed ? <Detail label="İlk merakı" value={item.firstMysterySeed} /> : null}
                    </dl>
                  </button>
                );
              })}
            </div>
          )}

          {beginnings.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="storybook-button-secondary" onClick={() => setStep(1)}>Geri dön</button>
              <button type="button" className="storybook-button" disabled={!selectedBeginning} onClick={() => setStep(3)}>Bu geçmişle devam et</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 3 && selectedBeginning ? (
        <section aria-labelledby="finish-heading" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-7 shadow-sm md:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Son dokunuşlar</p>
            <h2 id="finish-heading" className="mt-2 text-3xl font-extrabold text-on-surface">Karakter artık neredeyse hazır</h2>
            <p className="mt-3 text-on-surface-variant">İsterseniz adını ve kısa tür tanımını kişiselleştirin. Boş bırakırsanız seçtiğiniz başlangıç kendi önerisini kullanır.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold text-on-surface">Karakterin adı<input value={nameOverride} onChange={(event) => setNameOverride(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-outline-variant bg-white px-4 font-normal outline-none focus:border-primary" placeholder="İsterseniz siz verin" /></label>
              <label className="text-sm font-bold text-on-surface">Kısa tanımı<input value={subtypeOverride} onChange={(event) => setSubtypeOverride(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-outline-variant bg-white px-4 font-normal outline-none focus:border-primary" placeholder={selectedBeginning.subtype} /></label>
            </div>
            <div className="mt-7 rounded-[1.5rem] bg-surface-container-low/80 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">Seçtiğiniz geçmiş</p>
              <p className="mt-2 text-lg font-bold text-on-surface">{selectedBeginning.originConcept}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{selectedBeginning.startingLocation} · {selectedBeginning.homeArchetype}</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" className="storybook-button-secondary" onClick={() => setStep(2)}>Geçmişi değiştir</button>
              <button type="button" data-testid="create-character" className="storybook-button" disabled={submitting} onClick={() => void createCharacter()}>{submitting ? "Karakter tamamlanıyor…" : "Karakteri dünyaya getir"}</button>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-outline-variant/70 bg-[#27352b] p-7 text-white shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/60">Görsel kimlik</p>
            <h3 className="mt-2 text-2xl font-extrabold">Dört görünümden birini seçme adımı hazırlanıyor</h3>
            <div className="mt-5 grid grid-cols-2 gap-3" aria-hidden="true">
              {[1, 2, 3, 4].map((item) => <div key={item} className="aspect-square rounded-[1.2rem] border border-dashed border-white/25 bg-white/5" />)}
            </div>
            <p className="mt-5 text-sm leading-6 text-white/75">Henüz gerçek görsel üretim ve kalıcı görsel dosya yolu bağlanmadığı için bu kutular üretilmiş karakter resmi değildir. Karakteriniz şimdi oluşturulabilir; gerçek dört aday hazır olduğunda açıkça seçim yapacak ve seçilen görünüm sonraki resimler için görsel canon olacaktır.</p>
          </aside>
        </section>
      ) : null}
    </StoryShell>
  );
}

function StoryShell({ children }: { children: React.ReactNode }) {
  return <section className="storybook-page min-h-full"><div className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-6 md:py-10">{children}</div></section>;
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[1.5rem] border border-dashed border-outline-variant bg-white/80 px-6 py-10 text-center text-on-surface-variant">{children}</div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface-container-low/75 p-3"><dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-on-surface-variant">{label}</dt><dd className="mt-1 font-semibold leading-5 text-on-surface">{value}</dd></div>;
}
