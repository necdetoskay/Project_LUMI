"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type OnboardingState = {
  hasHousehold: boolean;
  householdId: string | null;
  householdName: string | null;
  childProfileCount: number;
  childProfiles: { id: string; displayName: string; ageBand: string }[];
};

type Step = "loading" | "create-household" | "add-profiles" | "complete";

export default function OnboardingPage() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        const s = data.onboarding as OnboardingState;
        setState(s);
        if (!s.hasHousehold) setStep("create-household");
        else if (s.childProfileCount === 0) setStep("add-profiles");
        else setStep("complete");
      })
      .catch(() => setError("Failed to load onboarding state"));
  }, []);

  if (error) return <ErrorDisplay message={error} />;
  if (step === "loading") return <LoadingDisplay />;

  return (
    <main className="flex-grow flex items-center justify-center px-padding-inline py-12 relative z-10">
      <div className="w-full max-w-[40rem] flex flex-col items-center">
        <div className="mb-12 text-center">
          <h1 className="font-headline-xl text-primary tracking-tight mb-2">
            LUMI
          </h1>
          <p className="font-lead text-secondary">Yeni bir macera başlıyor.</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 md:p-12 w-full shadow-sm">
          <nav className="flex items-center justify-between gap-2 mb-12">
            <div className="flex-1 flex flex-col items-center gap-2">
              <div
                className={`h-2 w-full rounded-full ${step === "create-household" ? "bg-primary-container shadow-[0_0_15px_rgba(109,74,255,0.3)]" : "bg-outline-variant"}`}
              ></div>
              <span
                className={`font-label-bold text-[12px] uppercase tracking-wider ${step === "create-household" ? "text-primary" : "text-outline"}`}
              >
                Evren oluştur
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2 opacity-40">
              <div className="h-2 w-full rounded-full bg-outline-variant"></div>
              <span className="font-label-bold text-outline text-[12px] uppercase tracking-wider">
                Profil ekle
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2 opacity-40">
              <div className="h-2 w-full rounded-full bg-outline-variant"></div>
              <span className="font-label-bold text-outline text-[12px] uppercase tracking-wider">
                Tamamlandı
              </span>
            </div>
          </nav>

          {step === "create-household" && (
            <CreateHouseholdForm
              onCreated={(h) => {
                setState((prev) =>
                  prev
                    ? {
                        ...prev,
                        hasHousehold: true,
                        householdId: h.id,
                        householdName: h.name,
                        childProfileCount: 0,
                        childProfiles: [],
                      }
                    : {
                        hasHousehold: true,
                        householdId: h.id,
                        householdName: h.name,
                        childProfileCount: 0,
                        childProfiles: [],
                      },
                );
                setStep("add-profiles");
              }}
              onError={setError}
            />
          )}

          {step === "add-profiles" && (
            <AddProfilesForm
              householdId={state!.householdId!}
              profiles={state?.childProfiles ?? []}
              onProfileAdded={(p) => {
                setState((prev) =>
                  prev
                    ? {
                        ...prev,
                        childProfiles: [...prev.childProfiles, p],
                        childProfileCount: prev.childProfileCount + 1,
                      }
                    : prev,
                );
              }}
              onError={setError}
            />
          )}

          {step === "complete" && <OnboardingCompleteDisplay />}
        </div>
      </div>
    </main>
  );
}

function CreateHouseholdForm({
  onCreated,
  onError,
}: {
  onCreated: (h: { id: string; name: string; slug: string }) => void;
  onError: (err: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        const res = await fetch("/api/households", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug }),
        });
        if (!res.ok) {
          const data = await res.json();
          onError(data.message ?? "Failed to create household");
          return;
        }
        const data = await res.json();
        onCreated(data.household);
      } catch {
        onError("Network error");
      } finally {
        setSubmitting(false);
      }
    },
    [name, slug, onCreated, onError],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="text-center md:text-left">
        <h2 className="font-headline-xl-mobile md:text-[32px] md:leading-[40px] text-on-surface font-bold mb-4 flex items-center justify-center md:justify-start gap-3">
          <span className="material-symbols-outlined text-primary text-4xl">
            rocket_launch
          </span>
          Aile evreni oluştur
        </h2>
        <p className="font-body text-secondary max-w-md">
          Aileniz için güvenli ve büyülü bir alan tasarlayın. Bu evren,
          paylaştığınız tüm anıların ve başarıların evi olacak.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="flex flex-col gap-2">
          <label
            className="font-label-bold text-on-surface-variant"
            htmlFor="universe_name"
          >
            Evren adı
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              rocket_launch
            </span>
            <input
              className="w-full pl-11 pr-4 py-3 bg-surface-bright border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body outline-none"
              id="universe_name"
              placeholder="Örn: Yıldız Tozu Ailesi"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="font-label-bold text-on-surface-variant"
            htmlFor="short_code"
          >
            Kısa kod
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              key
            </span>
            <input
              className="w-full pl-11 pr-4 py-3 bg-surface-bright border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body outline-none uppercase tracking-widest"
              id="short_code"
              placeholder="Örn: YILDIZ2024"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="^[a-z0-9-]+$"
              title="Yalnızca küçük harf, rakam ve tire"
              type="text"
            />
          </div>
          <p className="text-[12px] text-secondary mt-1">
            Bu kod, ailenizin diğer üyelerini davet etmek için kullanılacaktır.
          </p>
        </div>
      </div>
      <div className="pt-6">
        <button
          className="w-full bg-primary-container text-on-primary-container py-4 rounded-lg font-label-bold text-lg hover:bg-primary hover:text-on-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Oluşturuluyor..." : "Oluştur"}
          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </button>
      </div>
    </form>
  );
}

function AddProfilesForm({
  householdId,
  profiles,
  onProfileAdded,
  onError,
}: {
  householdId: string;
  profiles: { id: string; displayName: string; ageBand: string }[];
  onProfileAdded: (p: {
    id: string;
    displayName: string;
    ageBand: string;
  }) => void;
  onError: (err: string) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ageBand) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/child-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId, displayName, ageBand }),
        });
        if (!res.ok) {
          const data = await res.json();
          onError(data.message ?? "Failed to create profile");
          return;
        }
        const data = await res.json();
        onProfileAdded(data.profile);
        setDisplayName("");
        setAgeBand("");
      } catch {
        onError("Network error");
      } finally {
        setSubmitting(false);
      }
    },
    [householdId, displayName, ageBand, onProfileAdded, onError],
  );

  return (
    <div className="flex flex-col gap-8">
      <h2 className="font-headline-xl-mobile md:text-[32px] text-on-surface font-bold mb-4">
        Çocuk profilleri
      </h2>

      {profiles.length > 0 && (
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="p-4 border border-outline-variant rounded-xl flex justify-between items-center gap-4"
            >
              <div>
                <strong className="text-on-surface text-lg">
                  {p.displayName}
                </strong>
                <span className="ml-3 text-muted text-sm">{p.ageBand}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 max-w-[28rem]"
      >
        <div className="flex flex-col gap-2">
          <label
            className="font-label-bold text-on-surface-variant"
            htmlFor="childName"
          >
            Çocuğun adı
          </label>
          <input
            className="w-full px-[0.9rem] py-[0.8rem] rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline-variant font-body text-body"
            id="childName"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Örn: Elif"
            type="text"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="font-label-bold text-on-surface-variant"
            htmlFor="ageBand"
          >
            Yaş grubu
          </label>
          <select
            className="w-full px-[0.9rem] py-[0.8rem] rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all font-body text-body"
            id="ageBand"
            required
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value)}
          >
            <option value="">Seçin</option>
            <option value="3-5">3–5 yaş</option>
            <option value="6-8">6–8 yaş</option>
            <option value="9-12">9–12 yaş</option>
          </select>
        </div>
        <button
          className="w-full bg-primary-container text-on-primary-container py-[0.85rem] rounded-lg font-label-bold text-label-bold hover:bg-primary hover:text-on-primary transition-all"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Ekleniyor..." : "Profil ekle"}
        </button>
      </form>

      {profiles.length > 0 && (
        <Link
          className="bg-primary-container text-on-primary-container py-4 rounded-lg font-label-bold text-label-bold hover:bg-primary hover:text-on-primary transition-all text-center block"
          href="/app/profiles"
        >
          Kurulumu tamamla →
        </Link>
      )}
    </div>
  );
}

function OnboardingCompleteDisplay() {
  return (
    <div className="text-center py-12">
      <h2 className="font-headline-xl-mobile text-on-surface font-bold mb-4">
        Kurulum tamamlandı!
      </h2>
      <p className="font-lead text-lead text-secondary">
        Artık hikaye akışına başlayabilirsin. Yakında burada çocuk profillerini
        yönetebilecek ve hikaye evrenini keşfedebileksin.
      </p>
      <Link
        className="bg-primary-container text-on-primary-container py-4 px-8 rounded-lg font-label-bold text-label-bold hover:bg-primary hover:text-on-primary transition-all inline-block mt-6"
        href="/app/profiles"
      >
        Profillere git
      </Link>
    </div>
  );
}

function LoadingDisplay() {
  return (
    <section className="flex-grow flex items-center justify-center px-padding-inline py-12">
      <p className="text-muted">Yükleniyor...</p>
    </section>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <section className="flex-grow flex items-center justify-center px-padding-inline py-12">
      <p className="text-error">{message}</p>
    </section>
  );
}
