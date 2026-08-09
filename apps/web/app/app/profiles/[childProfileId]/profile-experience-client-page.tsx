"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { ProfileStoriesSection } from "@/components/story/profile-stories-section";

type Profile = {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: string;
  locale: string;
  createdAt: string;
};

type CharacterInfo = {
  id: string;
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  createdAt: string;
};

type Personalization = {
  childProfileId: string;
  interests: string[];
  customInterests: string[];
  developmentGoals: string[];
};

const INTERESTS = [
  ["dinosaurs", "🦖", "Dinozorlar"],
  ["space", "🚀", "Uzay"],
  ["animals", "🐾", "Hayvanlar"],
  ["sea", "🌊", "Deniz"],
  ["fantasy", "🐉", "Fantastik dünyalar"],
  ["vehicles", "🚂", "Araçlar"],
  ["puzzles", "🧩", "Bulmacalar"],
  ["sports", "⚽", "Spor"],
  ["art", "🎨", "Sanat"],
  ["nature", "🌳", "Doğa"],
  ["robots", "🤖", "Robotlar"],
  ["science", "🔬", "Bilim"],
] as const;

const GOALS = [
  ["sharing", "🤝", "Paylaşma"],
  ["self_expression", "🗣️", "Kendini ifade etme"],
  ["social_interaction", "👥", "Sosyal etkileşim"],
  ["empathy", "💛", "Empati"],
  ["patience", "🧘", "Sabır"],
  ["confidence", "🌟", "Özgüven"],
  ["problem_solving", "🧠", "Problem çözme"],
  ["resilience", "💪", "Zorluklarla başa çıkma"],
  ["responsibility", "🎯", "Sorumluluk"],
  ["listening", "👂", "Dinleme"],
] as const;

export default function ProfileExperienceClientPage({
  childProfileId,
}: {
  childProfileId: string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [personalization, setPersonalization] = useState<Personalization>({
    childProfileId,
    interests: [],
    customInterests: [],
    developmentGoals: [],
  });
  const [customInterest, setCustomInterest] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (
      requested &&
      ["overview", "personalization", "characters", "stories"].includes(
        requested,
      )
    ) {
      setActiveTab(requested);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const onboardingResponse = await fetch("/api/onboarding");
        const onboardingData = await onboardingResponse.json();
        const onboarding = onboardingData.onboarding as {
          hasHousehold: boolean;
          householdId: string | null;
        };
        if (!onboarding.hasHousehold || !onboarding.householdId) {
          setError("Önce aile alanı oluşturulmalı.");
          return;
        }
        setHouseholdId(onboarding.householdId);

        const query = `householdId=${encodeURIComponent(onboarding.householdId)}`;
        const [profileResponse, characterResponse, personalizationResponse] =
          await Promise.all([
            fetch(`/api/child-profiles/${encodeURIComponent(childProfileId)}?${query}`),
            fetch(
              `/api/characters?${query}&childProfileId=${encodeURIComponent(childProfileId)}`,
            ),
            fetch(
              `/api/child-profiles/${encodeURIComponent(childProfileId)}/personalization?${query}`,
            ),
          ]);

        if (!profileResponse.ok) {
          setError("Çocuk profili yüklenemedi.");
          return;
        }
        const profileData = await profileResponse.json();
        setProfile(profileData.profile);

        if (characterResponse.ok) {
          const characterData = await characterResponse.json();
          setCharacters(characterData.characters ?? []);
        }
        if (personalizationResponse.ok) {
          const personalizationData = await personalizationResponse.json();
          setPersonalization(personalizationData.personalization);
        }
      } catch {
        setError("Profil yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [childProfileId]);

  const firstCharacter = useMemo(() => characters[0] ?? null, [characters]);

  const toggleInterest = useCallback((value: string) => {
    setPersonalization((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value],
    }));
    setSaveMessage(null);
  }, []);

  const toggleGoal = useCallback((value: string) => {
    setPersonalization((current) => ({
      ...current,
      developmentGoals: current.developmentGoals.includes(value)
        ? current.developmentGoals.filter((item) => item !== value)
        : [...current.developmentGoals, value],
    }));
    setSaveMessage(null);
  }, []);

  const addCustomInterest = useCallback(() => {
    const value = customInterest.trim();
    if (!value) return;
    setPersonalization((current) => ({
      ...current,
      customInterests: current.customInterests.includes(value)
        ? current.customInterests
        : [...current.customInterests, value],
    }));
    setCustomInterest("");
    setSaveMessage(null);
  }, [customInterest]);

  const savePersonalization = useCallback(async () => {
    if (!householdId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch(
        `/api/child-profiles/${encodeURIComponent(childProfileId)}/personalization`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId, ...personalization }),
        },
      );
      if (!response.ok) {
        setSaveMessage("Değişiklikler kaydedilemedi.");
        return;
      }
      const data = await response.json();
      setPersonalization(data.personalization);
      setSaveMessage("Çocuğu tanıma bilgileri güncellendi.");
    } catch {
      setSaveMessage("Değişiklikler kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }, [childProfileId, householdId, personalization]);

  if (loading) {
    return <StateCard icon="auto_awesome" message="Çocuğun dünyası hazırlanıyor…" />;
  }
  if (error || !profile) {
    return <StateCard icon="error" message={error ?? "Profil bulunamadı."} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-7 px-4 py-6 sm:px-6 lg:py-9">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-on-surface-variant">
        <Link href="/app" className="hover:text-primary">Ailem</Link>
        <span className="material-symbols-outlined text-base">chevron_right</span>
        <Link href="/app/profiles" className="hover:text-primary">Çocuklar</Link>
        <span className="material-symbols-outlined text-base">chevron_right</span>
        <span className="text-on-surface">{profile.displayName}</span>
      </nav>

      <section className="relative overflow-hidden rounded-[32px] border border-primary/15 bg-[radial-gradient(circle_at_top_left,_rgba(109,74,255,0.22),_transparent_38%),linear-gradient(135deg,#fbf9ff_0%,#f2efff_55%,#fff8ee_100%)] p-6 shadow-sm md:p-9">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 right-16 text-[110px] opacity-[0.08]">✨</div>
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] border border-white/80 bg-white/80 text-4xl shadow-sm backdrop-blur">
              {firstCharacter ? "🧭" : "🌱"}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{profile.displayName}’in LUMI alanı</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface md:text-5xl">Onu tanıdıkça hikâyeler de değişsin.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant md:text-lg">
                İlgi alanlarını ve desteklemek istediğiniz gelişim alanlarını burada güncelleyin. LUMI bu bilgileri çocuğu etiketlemek için değil, ona daha anlamlı hikâye fırsatları sunmak için kullanır.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <InfoPill icon="cake" text={ageLabel(profile.ageBand)} />
                <InfoPill icon="favorite" text={`${personalization.interests.length + personalization.customInterests.length} ilgi alanı`} />
                <InfoPill icon="psychiatry" text={`${personalization.developmentGoals.length} destek hedefi`} />
                {firstCharacter ? <InfoPill icon="auto_awesome" text={firstCharacter.name} /> : null}
              </div>
            </div>
          </div>
          <div className="grid gap-3 rounded-[24px] border border-white/70 bg-white/65 p-5 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Dünyasına hızlı geçiş</p>
            <Link className="flex items-center justify-between rounded-2xl bg-primary px-5 py-4 font-bold text-on-primary shadow-sm transition-transform hover:-translate-y-0.5" href={`/app/profiles/${encodeURIComponent(childProfileId)}/world`}>
              <span>🌍 Dünyasını aç</span><span>→</span>
            </Link>
            {firstCharacter ? (
              <button className="flex items-center justify-between rounded-2xl border border-outline-variant bg-white px-5 py-4 text-left font-bold text-on-surface" type="button" onClick={() => setActiveTab("characters")}>
                <span>✨ {firstCharacter.name}</span><span>→</span>
              </button>
            ) : (
              <Link className="flex items-center justify-between rounded-2xl border border-outline-variant bg-white px-5 py-4 font-bold text-on-surface" href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}>
                <span>✨ İlk karakteri oluştur</span><span>→</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-surface-container-low p-2">
        <Tab active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>Genel Bakış</Tab>
        <Tab active={activeTab === "personalization"} onClick={() => setActiveTab("personalization")}>Çocuğu Tanıyalım</Tab>
        <Tab active={activeTab === "characters"} onClick={() => setActiveTab("characters")}>Karakterler</Tab>
        <Tab active={activeTab === "stories"} onClick={() => setActiveTab("stories")}>Hikâyeler</Tab>
      </div>

      {activeTab === "overview" ? (
        <Overview
          profile={profile}
          personalization={personalization}
          firstCharacter={firstCharacter}
          onOpenPersonalization={() => setActiveTab("personalization")}
        />
      ) : null}

      {activeTab === "personalization" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Panel eyebrow="❤️ Neleri seviyor?" title="İlgi alanları" description="Hikâyelerin dünyasını, karşılaşmaları ve temaları çocuğun sevdiği şeylerle daha anlamlı hale getirelim.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {INTERESTS.map(([value, emoji, label]) => (
                  <ChoiceCard key={value} selected={personalization.interests.includes(value)} onClick={() => toggleInterest(value)} emoji={emoji} label={label} />
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
                <label className="text-sm font-bold text-on-surface" htmlFor="custom-interest">Başka neleri seviyor?</label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input id="custom-interest" value={customInterest} onChange={(event) => setCustomInterest(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomInterest(); } }} className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-white px-4 py-3 outline-none focus:border-primary" placeholder="Örn: trenler, iş makineleri, gökyüzü…" />
                  <button type="button" onClick={addCustomInterest} className="rounded-xl bg-white px-5 py-3 font-bold text-primary shadow-sm">Ekle</button>
                </div>
                {personalization.customInterests.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {personalization.customInterests.map((item) => (
                      <button key={item} type="button" onClick={() => setPersonalization((current) => ({ ...current, customInterests: current.customInterests.filter((value) => value !== item) }))} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary">{item} ×</button>
                    ))}
                  </div>
                ) : null}
              </div>
            </Panel>

            <Panel eyebrow="🌱 Neleri destekleyelim?" title="Gelişim hedefleri" description="Bu hedefler çocuğa bir etiket veya puan olarak gösterilmez. LUMI bunları hikâyelerin içine doğal seçimler ve deneyimler olarak yerleştirir.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {GOALS.map(([value, emoji, label]) => (
                  <ChoiceCard key={value} selected={personalization.developmentGoals.includes(value)} onClick={() => toggleGoal(value)} emoji={emoji} label={label} compact />
                ))}
              </div>
            </Panel>

            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-on-surface">Değişiklikleri hikâye motoruna aktar</p>
                <p className="mt-1 text-sm text-on-surface-variant">Kaydedilen tercihler profil metadata’sında kalıcı olarak tutulur ve hikâye kişiselleştirme girdisi olarak kullanılabilir.</p>
                {saveMessage ? <p className="mt-2 text-sm font-semibold text-primary">{saveMessage}</p> : null}
              </div>
              <button type="button" disabled={saving} onClick={savePersonalization} className="rounded-xl bg-primary px-6 py-3 font-bold text-on-primary shadow-sm disabled:opacity-50">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>

          <aside className="space-y-5">
            <Panel eyebrow="✨ LUMI’nin fark ettikleri" title="Gözlemler" description="Hikâyeler ilerledikçe çocuğun tercihleriyle ilgili betimleyici, ebeveyn odaklı gözlemler burada görünecek.">
              <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm leading-6 text-on-surface-variant">
                Henüz yeterli hikâye gözlemi yok. LUMI burada “iyi/kötü” puanları üretmeyecek; örneğin hangi temalara daha çok yöneldiği veya iş birliği gerektiren durumlarda nasıl seçimler yaptığı gibi açıklanabilir gözlemler sunacak.
              </div>
            </Panel>
            <Panel eyebrow="📖 Hikâye yaklaşımı" title="Doğal öğrenme" description="Gelişim hedefleri ders başlığına dönüşmez.">
              <p className="text-sm leading-6 text-on-surface-variant">Örneğin “paylaşma” hedefinde doğrudan nasihat vermek yerine tek bir feneri iki karakterin birlikte kullanması gibi doğal bir hikâye durumu oluşturulur. Çocuk özgürce karar verir; sistem yalnızca fırsat sunar.</p>
            </Panel>
          </aside>
        </section>
      ) : null}

      {activeTab === "characters" ? (
        <section className="grid gap-5 md:grid-cols-2">
          {characters.length === 0 ? (
            <Panel eyebrow="✨ Karakterler" title="İlk kahraman henüz doğmadı" description="Çocuğun dünyasına eşlik edecek ilk karakteri birlikte oluşturalım.">
              <Link className="inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-on-primary" href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}>Karakter oluştur</Link>
            </Panel>
          ) : characters.map((character) => (
            <article key={character.id} className="overflow-hidden rounded-[28px] border border-outline-variant bg-white shadow-sm">
              <div className="h-36 bg-[radial-gradient(circle_at_top_right,_rgba(109,74,255,0.35),_transparent_35%),linear-gradient(135deg,#f5eeff,#eef8ff,#fff7e9)]" />
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{character.characterType}</p>
                <h2 className="mt-2 text-2xl font-extrabold text-on-surface">{character.name}</h2>
                <p className="mt-2 text-sm text-on-surface-variant">{character.broadKind} · {character.subtype}</p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "stories" ? (
        <section className="rounded-[28px] border border-outline-variant bg-white p-4 shadow-sm md:p-6">
          <ProfileStoriesSection childProfileId={childProfileId} />
        </section>
      ) : null}
    </main>
  );
}

function Overview({ profile, personalization, firstCharacter, onOpenPersonalization }: { profile: Profile; personalization: Personalization; firstCharacter: CharacterInfo | null; onOpenPersonalization: () => void }) {
  const interestLabels = [...personalization.interests.map((value) => INTERESTS.find(([key]) => key === value)?.[2]).filter(Boolean), ...personalization.customInterests];
  const goalLabels = personalization.developmentGoals.map((value) => GOALS.find(([key]) => key === value)?.[2]).filter(Boolean);
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Panel eyebrow="❤️ Onu tanıyalım" title="Sevdiği dünyalar" description="Hikâyelerin çocuğa tanıdık ve heyecan verici gelmesi için ilgi alanlarını güncel tutun.">
        {interestLabels.length ? <div className="flex flex-wrap gap-2">{interestLabels.map((label) => <span key={label} className="rounded-full bg-primary/8 px-3 py-2 text-sm font-bold text-primary">{label}</span>)}</div> : <EmptyLine text="Henüz ilgi alanı seçilmedi." />}
        <button type="button" onClick={onOpenPersonalization} className="mt-5 font-bold text-primary">İlgi alanlarını düzenle →</button>
      </Panel>
      <Panel eyebrow="🌱 Ebeveyn rehberliği" title="Desteklemek istediğiniz alanlar" description="Hedefler hikâyelere doğal seçim fırsatları olarak yansır; çocuğa eksiklik olarak gösterilmez.">
        {goalLabels.length ? <div className="flex flex-wrap gap-2">{goalLabels.map((label) => <span key={label} className="rounded-full bg-[#fff4dc] px-3 py-2 text-sm font-bold text-[#7a4f00]">{label}</span>)}</div> : <EmptyLine text="Henüz gelişim hedefi seçilmedi." />}
        <button type="button" onClick={onOpenPersonalization} className="mt-5 font-bold text-primary">Hedefleri düzenle →</button>
      </Panel>
      <Panel eyebrow="✨ Yol arkadaşı" title={firstCharacter?.name ?? "Karakter bekleniyor"} description={firstCharacter ? "Bu karakter çocuğun hikâyelerindeki devamlılığın önemli parçalarından biri." : "İlk karakter oluşturulduğunda burada çocuğun yol arkadaşı görünecek."}>
        <p className="text-sm leading-6 text-on-surface-variant">Profil yaşı: {ageLabel(profile.ageBand)} · Dil: {profile.locale}</p>
      </Panel>
      <Panel eyebrow="🔎 LUMI’nin fark ettikleri" title="Zamanla öğrenen profil" description="Sistem hikâyelerdeki seçimleri puanlamak yerine anlamlı eğilimleri ebeveyne açıklayacak.">
        <EmptyLine text="Henüz yeterli gözlem yok. İlk hikâyelerden sonra bu alan canlanacak." />
      </Panel>
    </section>
  );
}

function Panel({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-[28px] border border-outline-variant bg-white p-6 shadow-sm md:p-7"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p><h2 className="mt-2 text-2xl font-extrabold text-on-surface">{title}</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p><div className="mt-5">{children}</div></section>;
}

function ChoiceCard({ selected, onClick, emoji, label, compact = false }: { selected: boolean; onClick: () => void; emoji: string; label: string; compact?: boolean }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`flex ${compact ? "min-h-20" : "min-h-28"} flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary/8 shadow-sm ring-2 ring-primary/10" : "border-outline-variant bg-white hover:-translate-y-0.5 hover:border-primary/30"}`}><span className="text-2xl">{emoji}</span><span className="mt-3 text-sm font-bold text-on-surface">{label}</span>{selected ? <span className="absolute" /> : null}</button>;
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${active ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>{children}</button>;
}

function InfoPill({ icon, text }: { icon: string; text: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-sm font-semibold text-on-surface-variant"><span className="material-symbols-outlined text-base text-primary">{icon}</span>{text}</span>;
}

function EmptyLine({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">{text}</div>;
}

function StateCard({ icon, message }: { icon: string; message: string }) {
  return <main className="mx-auto flex min-h-[60vh] w-full max-w-[900px] items-center justify-center px-6"><div className="rounded-[28px] border border-outline-variant bg-white px-8 py-10 text-center shadow-sm"><span className="material-symbols-outlined text-4xl text-primary">{icon}</span><p className="mt-4 font-semibold text-on-surface">{message}</p></div></main>;
}

function ageLabel(ageBand: string) {
  return ageBand === "3-5" ? "3–5 yaş" : ageBand === "6-8" ? "6–8 yaş" : ageBand === "9-12" ? "9–12 yaş" : ageBand === "13+" ? "13+ yaş" : ageBand;
}
