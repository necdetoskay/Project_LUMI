"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CharacterKind = "human" | "animal" | "fantastic" | "synthetic";

type ProfileContext = {
  displayName: string;
};

const DEFAULT_CHARACTER_TYPE_VISUALS: Record<CharacterKind, string> = {
  human: "/onboarding/character-types/human.svg",
  animal: "/onboarding/character-types/animal.svg",
  fantastic: "/onboarding/character-types/fantastic.svg",
  synthetic: "/onboarding/character-types/synthetic.svg",
};

const CHARACTER_TYPES: Array<{
  id: CharacterKind;
  title: string;
  description: string;
  note?: string;
}> = [
  {
    id: "human",
    title: "İnsan",
    description: "Tıpkı senin gibi bir insan karakter.",
  },
  {
    id: "animal",
    title: "Hayvan",
    description: "Sevimli veya vahşi bir hayvan.",
  },
  {
    id: "fantastic",
    title: "Fantastik",
    description: "Büyülü varlıklar dünyasından biri.",
  },
  {
    id: "synthetic",
    title: "Sentetik",
    description: "Yapay veya teknoloji tabanlı bir varlık.",
    note: "Bazı dünyalarda açıklama gerektirir",
  },
];

const STEPS = [
  "Karakter Tipi",
  "Karakter",
  "Evren",
  "Dünya",
  "Uyum",
  "Bölge",
  "Origin",
  "Saga",
  "Hazır",
];

export default function CharacterTypeStepClient({
  childProfileId,
  characterTypeVisuals = DEFAULT_CHARACTER_TYPE_VISUALS,
  fallbackCharacterTypeVisuals = DEFAULT_CHARACTER_TYPE_VISUALS,
}: {
  childProfileId: string;
  characterTypeVisuals?: Record<CharacterKind, string>;
  fallbackCharacterTypeVisuals?: Record<CharacterKind, string>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CharacterKind | null>(null);
  const [profile, setProfile] = useState<ProfileContext | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const onboardingResponse = await fetch("/api/onboarding", {
          signal: controller.signal,
        });
        if (!onboardingResponse.ok) return;
        const onboardingBody = (await onboardingResponse.json()) as {
          onboarding?: { householdId: string | null };
        };
        const householdId = onboardingBody.onboarding?.householdId;
        if (!householdId) return;

        const response = await fetch(
          `/api/child-profiles/${encodeURIComponent(childProfileId)}?householdId=${encodeURIComponent(householdId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const body = (await response.json()) as {
          profile?: { displayName: string };
        };
        if (!controller.signal.aborted && body.profile?.displayName) {
          setProfile({ displayName: body.profile.displayName });
        }
      } catch {
        // Profile context is helpful but not required for this step.
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [childProfileId]);

  const dashboardHref = `/app/profiles/${encodeURIComponent(childProfileId)}`;

  function continueToCharacterStep() {
    if (!selected) return;
    router.push(
      `${dashboardHref}/characters/new/character?characterType=${encodeURIComponent(selected)}`,
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f4ea] text-[#34281f]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="border-b border-[#e8dcc8] bg-[#fffaf0] px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
          <div className="flex items-center justify-between lg:block">
            <Link
              href="/app/profiles"
              className="text-3xl font-black tracking-[0.14em] text-[#1f7a70]"
            >
              LUMI
            </Link>
            <Link
              href={dashboardHref}
              className="rounded-full border border-[#dfd2be] bg-white px-3 py-2 text-xs font-bold text-[#51463d] lg:hidden"
            >
              Geri dön
            </Link>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-10 lg:flex-col lg:overflow-visible">
            <SidebarLink icon="home" label="Ana Sayfa" href={dashboardHref} />
            <SidebarLink
              icon="face_6"
              label="Karakterler"
              href={`${dashboardHref}?section=characters`}
              active
            />
            <SidebarLink
              icon="auto_stories"
              label="Hikâyeler"
              href={`${dashboardHref}?section=stories`}
            />
            <SidebarLink
              icon="backpack"
              label="Çanta"
              href={`${dashboardHref}?section=bag`}
            />
            <SidebarLink
              icon="map"
              label="Harita"
              href={`${dashboardHref}/world`}
            />
          </nav>

          <div className="mt-8 hidden rounded-[28px] bg-[linear-gradient(160deg,#edf5ea,#fff5dc)] p-5 lg:block">
            <span className="material-symbols-outlined text-3xl text-[#c2862b]">
              emoji_nature
            </span>
            <p className="mt-3 font-extrabold text-[#3b3028]">
              Yeni bir başlangıç
            </p>
            <p className="mt-1 text-sm leading-6 text-[#65584d]">
              Seçimlerin dünyayı, kökeni ve uzun hikâye yolculuğunu birlikte
              şekillendirecek.
            </p>
          </div>
        </aside>

        <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 xl:px-10">
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 text-sm font-extrabold text-[#16786f]"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              aria-hidden="true"
            >
              arrow_back
            </span>
            {profile?.displayName
              ? `${profile.displayName}'nın alanına dön`
              : "Çocuk alanına dön"}
          </Link>

          <header className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c2862b]">
              Karakter yolculuğu
            </p>
            <h1 className="mt-2 font-serif text-4xl font-black tracking-tight text-[#34281f] sm:text-5xl">
              Yeni Karakter Oluştur <span aria-hidden="true">🌿</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#6a5c50] sm:text-lg">
              Birlikte yaşayacağın yeni karakteri adım adım oluşturalım.
            </p>
          </header>

          <ol
            aria-label="Karakter oluşturma adımları"
            className="mt-7 flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-9 lg:overflow-visible"
          >
            {STEPS.map((label, index) => {
              const active = index === 0;
              return (
                <li
                  key={label}
                  aria-current={active ? "step" : undefined}
                  className="min-w-[92px] text-center"
                >
                  <div
                    className={`mx-auto grid h-10 w-10 place-items-center rounded-full border text-sm font-black ${
                      active
                        ? "border-[#16786f] bg-[#16786f] text-white shadow-sm"
                        : "border-[#dfd2be] bg-[#fffdf7] text-[#66594e]"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p
                    className={`mt-2 text-xs font-bold ${active ? "text-[#16786f]" : "text-[#6d6157]"}`}
                  >
                    {label}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="relative overflow-hidden rounded-[32px] border border-[#cfe0d5] bg-[radial-gradient(circle_at_top_left,#fffdf7_0,#fffdf7_55%,#f7fbf2_100%)] p-5 shadow-[0_16px_42px_rgba(89,70,45,0.09)] sm:p-7 lg:p-8">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-2 top-4 rotate-[-18deg] text-5xl opacity-55"
              >
                🌿
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-3 bottom-3 rotate-[22deg] text-5xl opacity-35"
              >
                🍃
              </span>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1f7a70]">
                  1. adım
                </p>
                <h2 className="mt-2 font-serif text-3xl font-black tracking-tight sm:text-4xl">
                  Nasıl bir karakter olsun?
                </h2>
                <p className="mt-2 text-[#6a5c50]">
                  Karakter tipini seçerek başlayalım.
                </p>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {CHARACTER_TYPES.map((type) => {
                  const isSelected = selected === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      aria-pressed={isSelected}
                      data-testid={`character-type-${type.id}`}
                      onClick={() => setSelected(type.id)}
                      className={`relative min-h-[330px] rounded-[28px] border p-5 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#65a69d]/35 ${
                        isSelected
                          ? "border-[#16786f] bg-[#f2faf4] shadow-[0_14px_36px_rgba(22,120,111,0.16)] ring-2 ring-[#16786f]/25"
                          : "border-[#e4d8c7] bg-white hover:-translate-y-1 hover:border-[#b8cfc5] hover:shadow-md"
                      }`}
                    >
                      {isSelected ? (
                        <span className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-[#16786f] text-white shadow-md">
                          <span
                            className="material-symbols-outlined text-[19px]"
                            aria-hidden="true"
                          >
                            check
                          </span>
                        </span>
                      ) : null}
                      <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-[linear-gradient(145deg,#edf5ea,#fff0d6)] shadow-[0_8px_24px_rgba(69,70,48,0.14)] sm:h-36 sm:w-36">
                        <img
                          src={characterTypeVisuals[type.id]}
                          alt={`${type.title} karakter tipi illüstrasyonu`}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            const fallback =
                              fallbackCharacterTypeVisuals[type.id];
                            if (
                              event.currentTarget.src !==
                              new URL(fallback, window.location.origin).href
                            ) {
                              event.currentTarget.src = fallback;
                            }
                          }}
                        />
                      </div>
                      <h3 className="mt-5 font-serif text-2xl font-black text-[#176d65]">
                        {type.title}
                      </h3>
                      <p className="mx-auto mt-2 max-w-[210px] text-sm leading-6 text-[#65584d]">
                        {type.description}
                      </p>
                      {type.note ? (
                        <span className="mt-4 inline-flex rounded-full bg-[#f5ead4] px-3 py-1.5 text-xs font-bold text-[#8a672f]">
                          {type.note}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="relative overflow-hidden rounded-[28px] border border-[#e4d8c7] bg-[#fffdf7] p-6 shadow-[0_12px_34px_rgba(89,70,45,0.08)]">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-3 top-2 rotate-[20deg] text-4xl opacity-45"
                >
                  🌿
                </span>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf3e9] text-[#16786f]">
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      auto_awesome
                    </span>
                  </span>
                  <h2 className="font-serif text-xl font-black">
                    Seçim etkisi
                  </h2>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#65584d]">
                  Seçtiğin karakter tipi, sana sunulan dünyaları, kökenleri ve
                  ana hikâye hedeflerini etkiler.
                </p>
                <div className="mt-5 space-y-4">
                  <ImpactRow
                    icon="public"
                    title="Dünyalar"
                    text="Uygun dünyalar karakter tipine göre değerlendirilir."
                  />
                  <ImpactRow
                    icon="eco"
                    title="Kökenler"
                    text="Dünya ve karakterle uyumlu kökenler hazırlanır."
                  />
                  <ImpactRow
                    icon="track_changes"
                    title="Hikâye Hedefleri"
                    text="Core Saga seçenekleri bu temelden şekillenir."
                  />
                </div>
              </section>

              <section className="flex items-center gap-4 rounded-[24px] border border-[#e4d8c7] bg-[#fff9ed] p-5 shadow-sm">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#edf5ea] shadow-sm">
                  <img
                    src={characterTypeVisuals.human}
                    alt="Profil illüstrasyonu"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      const fallback = fallbackCharacterTypeVisuals.human;
                      if (
                        event.currentTarget.src !==
                        new URL(fallback, window.location.origin).href
                      ) {
                        event.currentTarget.src = fallback;
                      }
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9a6d28]">
                    Profil
                  </p>
                  <p className="mt-1 truncate font-serif text-lg font-black">
                    {profile?.displayName ?? "Çocuk profili"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#a06e25]">
                    ✨ Henüz evren seçilmedi
                  </p>
                </div>
              </section>
            </aside>
          </div>

          <footer className="mt-5 flex flex-col-reverse gap-3 rounded-[26px] border border-[#eadfce] bg-[#fffdf7] p-4 shadow-[0_10px_28px_rgba(89,70,45,0.06)] sm:flex-row sm:items-center sm:justify-end">
            <Link
              href={dashboardHref}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dfd2be] bg-white px-6 font-extrabold text-[#51463d]"
            >
              Vazgeç
            </Link>
            <button
              type="button"
              disabled={!selected}
              onClick={continueToCharacterStep}
              className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1a8176,#167066)] px-6 font-extrabold text-white shadow-[0_8px_20px_rgba(22,120,111,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                aria-hidden="true"
              >
                auto_awesome
              </span>
              Devam et
              <span
                className="material-symbols-outlined text-[20px]"
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </button>
          </footer>
        </div>
      </div>
    </main>
  );
}

function SidebarLink({
  icon,
  label,
  href,
  active = false,
}: {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition lg:w-full ${
        active
          ? "bg-[#e7f2ec] text-[#176d65]"
          : "text-[#5d5147] hover:bg-[#f2eee6]"
      }`}
    >
      <span
        className="material-symbols-outlined text-[21px]"
        aria-hidden="true"
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

function ImpactRow({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#edf5ea] text-[#16786f]">
        <span
          className="material-symbols-outlined text-[19px]"
          aria-hidden="true"
        >
          {icon}
        </span>
      </span>
      <div>
        <p className="font-extrabold text-[#176d65]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#6a5c50]">{text}</p>
      </div>
    </div>
  );
}
