"use client";

import { useCallback, useEffect, useState } from "react";

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
    <section className="container page-section">
      <p className="eyebrow">LUMI KURULUM</p>
      <h1>Profil ve evren kurulumu</h1>
      <StepIndicator current={step} />

      {step === "create-household" && (
        <CreateHouseholdForm
          onCreated={(h) => {
            setState((prev) =>
              prev
                ? { ...prev, hasHousehold: true, householdId: h.id, householdName: h.name, childProfileCount: 0, childProfiles: [] }
                : { hasHousehold: true, householdId: h.id, householdName: h.name, childProfileCount: 0, childProfiles: [] },
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
                ? { ...prev, childProfiles: [...prev.childProfiles, p], childProfileCount: prev.childProfileCount + 1 }
                : prev,
            );
          }}
          onComplete={() => setStep("complete")}
          onError={setError}
        />
      )}

      {step === "complete" && (
        <OnboardingCompleteDisplay />
      )}
    </section>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { key: "create-household", label: "Evren oluştur" },
    { key: "add-profiles", label: "Profil ekle" },
    { key: "complete", label: "Tamamlandı" },
  ] as const;

  const idx = steps.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Kurulum adımları" style={{ display: "flex", gap: "1rem", marginBlock: "2rem" }}>
      {steps.map((s, i) => (
        <span
          key={s.key}
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.85rem",
            fontWeight: 600,
            background: i <= idx ? "var(--primary)" : "var(--surface)",
            color: i <= idx ? "white" : "var(--muted)",
          }}
        >
          {i + 1}. {s.label}
        </span>
      ))}
    </nav>
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
    <form onSubmit={handleSubmit} style={{ maxWidth: "28rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2>Aile evreni oluştur</h2>
      <label>
        Evren adı
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ör. LUMI Ailesi"
        />
      </label>
      <label>
        Kısa kod
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ör. lumi-ailesi"
          pattern="^[a-z0-9-]+$"
          title="Yalnızca küçük harf, rakam ve tire"
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Oluşturuluyor..." : "Oluştur"}
      </button>
    </form>
  );
}

function AddProfilesForm({
  householdId,
  profiles,
  onProfileAdded,
  onComplete,
  onError,
}: {
  householdId: string;
  profiles: { id: string; displayName: string; ageBand: string }[];
  onProfileAdded: (p: { id: string; displayName: string; ageBand: string }) => void;
  onComplete: () => void;
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h2>Çocuk profilleri</h2>

      {profiles.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {profiles.map((p) => (
            <li key={p.id} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <strong>{p.displayName}</strong> &mdash; {p.ageBand}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "28rem" }}>
        <label>
          Çocuğun adı
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="ör. Elif"
          />
        </label>
        <label>
          Yaş grubu
          <select required value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
            <option value="">Seçin</option>
            <option value="3-5">3–5 yaş</option>
            <option value="6-8">6–8 yaş</option>
            <option value="9-11">9–11 yaş</option>
          </select>
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Ekleniyor..." : "Profil ekle"}
        </button>
      </form>

      {profiles.length > 0 && (
        <button className="button-link" onClick={onComplete}>
          Kurulumu tamamla &rarr;
        </button>
      )}
    </div>
  );
}

function OnboardingCompleteDisplay() {
  return (
    <div style={{ textAlign: "center", paddingBlock: "3rem" }}>
      <h2>Kurulum tamamlandı!</h2>
      <p className="lead">
        Artık hikâye akışına başlayabilirsin. Yakında burada çocuk profillerini
        yönetebilecek ve hikâye evrenini keşfedebileceksin.
      </p>
      <a className="button-link" href="/app/profiles" style={{ marginTop: "1.5rem", display: "inline-block" }}>
        Profillere git
      </a>
    </div>
  );
}

function LoadingDisplay() {
  return (
    <section className="container page-section">
      <p>Yükleniyor...</p>
    </section>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <section className="container page-section">
      <p style={{ color: "red" }}>{message}</p>
    </section>
  );
}
