"use client";

import { useCallback, useEffect, useState } from "react";

type Profile = {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: string;
  locale: string;
  createdAt: string;
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        const s = data.onboarding as { hasHousehold: boolean; householdId: string | null };
        if (!s.hasHousehold || !s.householdId) {
          setError("No household found. Complete onboarding first.");
          setLoading(false);
          return;
        }

        setHouseholdId(s.householdId);
        return fetch(`/api/child-profiles?householdId=${s.householdId}`);
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data) {
          setProfiles(data.profiles);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profiles");
        setLoading(false);
      });
  }, []);

  const archiveProfile = useCallback(async (profileId: string) => {
    if (!householdId) {
      setError("Household not available");
      return;
    }

    setArchivingId(profileId);
    try {
      const res = await fetch(`/api/child-profiles/${profileId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Failed to archive profile");
        return;
      }

      setProfiles((current) => current.filter((profile) => profile.id !== profileId));
    } catch {
      setError("Failed to archive profile");
    } finally {
      setArchivingId(null);
    }
  }, [householdId]);

  if (loading) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <section className="container page-section">
      <p className="eyebrow">PROFILLER</p>
      <h1>Cocuk profilleri</h1>

      {profiles.length === 0 ? (
        <p className="lead">
          Henuz bir profil eklenmemis. {" "}
          <a href="/app/onboarding" style={{ color: "var(--primary)" }}>
            Kurulum sayfasina git
          </a>
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
          {profiles.map((p) => (
            <div
              key={p.id}
              style={{
                padding: "1rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div>
                <strong style={{ fontSize: "1.1rem" }}>{p.displayName}</strong>
                <span style={{ marginLeft: "0.75rem", color: "var(--muted)", fontSize: "0.9rem" }}>
                  {p.ageBand}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                </span>
                <button
                  type="button"
                  onClick={() => archiveProfile(p.id)}
                  disabled={archivingId === p.id}
                >
                  {archivingId === p.id ? "Arsivleniyor..." : "Arsivle"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LoadingDisplay() {
  return (
    <section className="container page-section">
      <p>Yukleniyor...</p>
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
