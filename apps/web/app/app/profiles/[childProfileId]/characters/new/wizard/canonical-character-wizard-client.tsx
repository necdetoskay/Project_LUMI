"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type StepKey =
  | "character_type"
  | "character_identity"
  | "universe"
  | "world"
  | "compatibility"
  | "region"
  | "origin"
  | "core_saga"
  | "final_review";

type Cycle = {
  id: string;
  currentStep: StepKey;
  latestSummary?: Record<string, unknown> | null;
};

type Candidate = Record<string, unknown> & { key: string };

type ApiResult = {
  cycle?: Cycle;
  suggestions?: Candidate[];
  characterId?: string;
  worldId?: string;
  error?: string;
  message?: string;
};

const STEPS: Array<{ key: StepKey; label: string }> = [
  { key: "character_type", label: "Karakter Tipi" },
  { key: "character_identity", label: "Karakter" },
  { key: "universe", label: "Evren" },
  { key: "world", label: "Dünya" },
  { key: "compatibility", label: "Uyum" },
  { key: "region", label: "Bölge" },
  { key: "origin", label: "Origin" },
  { key: "core_saga", label: "Saga" },
  { key: "final_review", label: "Hazır" },
];

const CHARACTER_TYPES = [
  { key: "human", title: "İnsan", text: "İnsan bir kahraman." },
  { key: "animal", title: "Hayvan", text: "Hayvan bir kahraman." },
  {
    key: "fantastic",
    title: "Fantastik",
    text: "Büyülü veya fantastik bir varlık.",
  },
  {
    key: "synthetic",
    title: "Sentetik",
    text: "Teknoloji tabanlı bir varlık.",
  },
] as const;

const UNIVERSES = [
  {
    key: "lumi-prime",
    name: "LUMI Ana Evreni",
    text: "Birbirine bağlı dünyaların ana evreni.",
  },
  {
    key: "star-garden",
    name: "Yıldız Bahçesi",
    text: "Gökyüzü, ışık ve keşif temalı bir evren.",
  },
  {
    key: "tide-archive",
    name: "Gelgit Arşivi",
    text: "Okyanus, adalar ve yaşayan hafıza temalı bir evren.",
  },
] as const;

function titleOf(candidate: Candidate): string {
  return String(candidate.name ?? candidate.title ?? candidate.key);
}

function descriptionOf(candidate: Candidate): string {
  return String(
    candidate.identity ??
      candidate.description ??
      candidate.explanation ??
      candidate.origin ??
      candidate.premise ??
      candidate.biome ??
      "",
  );
}

export default function CanonicalCharacterWizardClient({
  childProfileId,
}: {
  childProfileId: string;
}) {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = cycle?.currentStep ?? "character_type";
  const stepIndex = Math.max(
    0,
    STEPS.findIndex((item) => item.key === step),
  );
  const summary = cycle?.latestSummary ?? {};

  const request = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (!householdId) throw new Error("HOUSEHOLD_REQUIRED");
      const response = await fetch("/api/character-creation/canonical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, householdId, childProfileId, ...extra }),
      });
      const body = (await response.json()) as ApiResult;
      if (!response.ok)
        throw new Error(
          body.message ?? body.error ?? "ONBOARDING_REQUEST_FAILED",
        );
      return body;
    },
    [householdId, childProfileId],
  );

  const refreshCycle = useCallback(
    async (nextHouseholdId: string) => {
      const response = await fetch(
        `/api/character-creation/canonical?householdId=${encodeURIComponent(nextHouseholdId)}&childProfileId=${encodeURIComponent(childProfileId)}`,
      );
      if (!response.ok) throw new Error("CYCLE_LOAD_FAILED");
      const body = (await response.json()) as ApiResult;
      if (body.cycle) {
        setCycle(body.cycle);
        return body.cycle;
      }
      const startResponse = await fetch("/api/character-creation/canonical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          householdId: nextHouseholdId,
          childProfileId,
        }),
      });
      const started = (await startResponse.json()) as ApiResult;
      if (!startResponse.ok || !started.cycle)
        throw new Error(started.message ?? "CYCLE_START_FAILED");
      setCycle(started.cycle);
      return started.cycle;
    },
    [childProfileId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const onboardingResponse = await fetch("/api/onboarding");
        const onboardingBody = (await onboardingResponse.json()) as {
          onboarding?: { householdId: string | null };
        };
        const nextHouseholdId = onboardingBody.onboarding?.householdId;
        if (!onboardingResponse.ok || !nextHouseholdId)
          throw new Error("HOUSEHOLD_NOT_READY");
        if (cancelled) return;
        setHouseholdId(nextHouseholdId);
        await refreshCycle(nextHouseholdId);
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Onboarding yüklenemedi.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCycle]);

  const generationAction = useMemo(() => {
    if (step === "character_identity") return "generate-identity";
    if (step === "world") return "generate-world";
    if (step === "compatibility") return "generate-compatibility";
    if (step === "region") return "generate-region";
    if (step === "origin") return "generate-origin";
    if (step === "core_saga") return "generate-saga";
    return null;
  }, [step]);

  useEffect(() => {
    if (!generationAction || !householdId || loading) {
      setCandidates([]);
      setSelected(null);
      return;
    }
    let cancelled = false;
    setGenerationLoading(true);
    setCandidates([]);
    setSelected(null);
    setError(null);
    void request(generationAction)
      .then((body) => {
        if (!cancelled) setCandidates(body.suggestions ?? []);
      })
      .catch((caught) => {
        if (!cancelled)
          setError(
            caught instanceof Error ? caught.message : "Öneriler üretilemedi.",
          );
      })
      .finally(() => {
        if (!cancelled) setGenerationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [generationAction, householdId, loading, request]);

  async function advance(action: string, extra: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const body = await request(action, extra);
      if (body.cycle) setCycle(body.cycle);
      setSelected(null);
      setCandidates([]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Seçim kaydedilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function finalize() {
    setSubmitting(true);
    setError(null);
    try {
      const body = await request("finalize");
      if (!body.characterId) throw new Error("CHARACTER_ID_MISSING");
      router.push(
        `/app/profiles/${encodeURIComponent(childProfileId)}/characters/${encodeURIComponent(body.characterId)}`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Karakter tamamlanamadı.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f4ea] p-8 text-[#34281f]">
        <div
          data-testid="onboarding-loading"
          className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm"
        >
          Karakter yolculuğu yükleniyor…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f4ea] px-4 py-6 text-[#34281f] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/app/profiles/${encodeURIComponent(childProfileId)}`}
          className="text-sm font-extrabold text-[#16786f]"
        >
          ← Çocuk alanına dön
        </Link>
        <header className="mt-4 rounded-[32px] border border-[#e4d8c7] bg-[#fffdf7] p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c2862b]">
            Karakter yolculuğu
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">
            Yeni Karakter Oluştur
          </h1>
          <ol
            aria-label="Karakter oluşturma adımları"
            className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-9"
          >
            {STEPS.map((item, index) => {
              const active = index === stepIndex;
              const done = index < stepIndex;
              return (
                <li
                  key={item.key}
                  data-testid={`progress-${item.key}`}
                  aria-current={active ? "step" : undefined}
                  className="text-center"
                >
                  <div
                    className={`mx-auto grid h-9 w-9 place-items-center rounded-full border text-xs font-black ${active ? "border-[#16786f] bg-[#16786f] text-white" : done ? "border-[#7fa89a] bg-[#e7f2ec] text-[#176d65]" : "border-[#dfd2be] bg-white text-[#71645a]"}`}
                  >
                    {done ? "✓" : index + 1}
                  </div>
                  <p className="mt-1 text-[11px] font-bold">{item.label}</p>
                </li>
              );
            })}
          </ol>
        </header>

        <section
          data-testid="canonical-onboarding-step"
          data-step={step}
          className="mt-5 rounded-[32px] border border-[#e4d8c7] bg-white p-6 shadow-sm sm:p-8"
        >
          <StepHeading step={step} />
          {error ? (
            <p
              data-testid="onboarding-error"
              className="mt-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-700"
            >
              {error}
            </p>
          ) : null}

          {step === "character_type" ? (
            <ChoiceGrid>
              {CHARACTER_TYPES.map((item) => (
                <ChoiceButton
                  key={item.key}
                  testId={`choice-${item.key}`}
                  selected={selected === item.key}
                  onClick={() => setSelected(item.key)}
                  title={item.title}
                  description={item.text}
                />
              ))}
            </ChoiceGrid>
          ) : null}

          {step === "universe" ? (
            <ChoiceGrid>
              {UNIVERSES.map((item) => (
                <ChoiceButton
                  key={item.key}
                  testId={`choice-${item.key}`}
                  selected={selected === item.key}
                  onClick={() => setSelected(item.key)}
                  title={item.name}
                  description={item.text}
                />
              ))}
            </ChoiceGrid>
          ) : null}

          {generationAction ? (
            generationLoading ? (
              <div
                data-testid="generation-loading"
                className="mt-6 rounded-2xl bg-[#f4f0e8] p-6 font-bold text-[#65584d]"
              >
                Öneriler hazırlanıyor…
              </div>
            ) : (
              <ChoiceGrid>
                {candidates.map((candidate) => (
                  <ChoiceButton
                    key={candidate.key}
                    testId="candidate-card"
                    selected={selected === candidate.key}
                    onClick={() => setSelected(candidate.key)}
                    title={titleOf(candidate)}
                    description={descriptionOf(candidate)}
                  />
                ))}
              </ChoiceGrid>
            )
          ) : null}

          {step === "final_review" ? <Review summary={summary} /> : null}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#eee5d8] pt-5">
            <button
              type="button"
              data-testid="browser-back"
              onClick={() => router.back()}
              className="rounded-2xl border border-[#dfd2be] bg-white px-5 py-3 font-extrabold text-[#51463d]"
            >
              Geri
            </button>
            {step === "final_review" ? (
              <button
                type="button"
                data-testid="finalize-character"
                disabled={submitting}
                onClick={() => void finalize()}
                className="rounded-2xl bg-[#16786f] px-6 py-3 font-extrabold text-white disabled:opacity-50"
              >
                {submitting ? "Tamamlanıyor…" : "Karakteri tamamla"}
              </button>
            ) : (
              <button
                type="button"
                data-testid="continue-step"
                disabled={!selected || submitting || generationLoading}
                onClick={() => {
                  if (!selected) return;
                  if (step === "character_type")
                    void advance("select-character-type", {
                      characterType: selected,
                    });
                  else if (step === "universe") {
                    const universe = UNIVERSES.find(
                      (item) => item.key === selected,
                    );
                    if (universe)
                      void advance("select-universe", {
                        universe: { key: universe.key, name: universe.name },
                      });
                  } else {
                    const suggestion = candidates.find(
                      (item) => item.key === selected,
                    );
                    if (!suggestion) return;
                    const actionByStep: Partial<Record<StepKey, string>> = {
                      character_identity: "select-identity",
                      world: "select-world",
                      compatibility: "select-compatibility",
                      region: "select-region",
                      origin: "select-origin",
                      core_saga: "select-saga",
                    };
                    const action = actionByStep[step];
                    if (action) void advance(action, { suggestion });
                  }
                }}
                className="rounded-2xl bg-[#16786f] px-6 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Kaydediliyor…" : "Devam et"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StepHeading({ step }: { step: StepKey }) {
  const copy: Record<StepKey, [string, string]> = {
    character_type: ["1. Karakter Tipi", "Nasıl bir karakter olsun?"],
    character_identity: ["2. Karakter", "Bu karakter kim olsun?"],
    universe: ["3. Evren", "Hangi büyük evrende yaşasın?"],
    world: ["4. Dünya", "Karaktere uygun bir dünya seçelim."],
    compatibility: [
      "5. Uyum",
      "Karakter ve dünya birlikte doğal çalışıyor mu?",
    ],
    region: ["6. Bölge", "Dünya içinde başlangıç bölgesini seçelim."],
    origin: ["7. Origin", "Karakterin kökeni ne olsun?"],
    core_saga: ["8. Core Saga", "Uzun hikâye yolculuğunun omurgasını seçelim."],
    final_review: [
      "9. Hazır",
      "Seçimleri gözden geçir ve karakteri dünyaya ekle.",
    ],
  };
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1f7a70]">
        {copy[step][0]}
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-4xl">{copy[step][1]}</h2>
    </div>
  );
}

function ChoiceGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div>;
}

function ChoiceButton({
  testId,
  selected,
  onClick,
  title,
  description,
}: {
  testId: string;
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-[24px] border p-5 text-left transition ${selected ? "border-[#16786f] bg-[#eff8f1] ring-2 ring-[#16786f]/20" : "border-[#e4d8c7] bg-[#fffdf7] hover:border-[#9fbdb2]"}`}
    >
      <h3 className="text-xl font-black text-[#176d65]">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[#65584d]">{description}</p>
      ) : null}
    </button>
  );
}

function Review({ summary }: { summary: Record<string, unknown> }) {
  const rows = [
    ["Karakter tipi", summary.characterType],
    ["Karakter", summary.characterIdentity],
    ["Evren", summary.universe],
    ["Dünya", summary.world],
    ["Uyum", summary.compatibility],
    ["Bölge", summary.region],
    ["Origin", summary.origin],
    ["Core Saga", summary.coreSaga],
  ] as const;
  return (
    <dl data-testid="final-review" className="mt-6 grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="rounded-2xl border border-[#eee5d8] bg-[#fffdf7] p-4"
        >
          <dt className="text-xs font-black uppercase tracking-[0.12em] text-[#9a6d28]">
            {label}
          </dt>
          <dd className="mt-2 font-bold text-[#4c4036]">
            {formatSummary(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatSummary(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "—";
  const record = value as Record<string, unknown>;
  return String(
    record.name ??
      record.title ??
      record.characterType ??
      record.classification ??
      record.key ??
      "Seçildi",
  );
}
