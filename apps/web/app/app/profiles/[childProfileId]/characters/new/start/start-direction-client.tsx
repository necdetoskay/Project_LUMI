"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Direction = "character_first" | "world_first";

export function StartDirectionClient({ childProfileId }: { childProfileId: string }) {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Direction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void fetch("/api/onboarding").then((r) => r.json()).then((body) => setHouseholdId(body.onboarding?.householdId ?? null)).catch(() => setError("Aile alanı yüklenemedi.")); }, []);

  async function choose(direction: Direction) {
    if (!householdId || saving) return;
    setSaving(direction); setError(null);
    const response = await fetch("/api/character-creation/cycle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ householdId, childProfileId, direction }) });
    if (!response.ok) { setSaving(null); setError("Seçim kaydedilemedi. Tekrar deneyin."); return; }
    router.push(direction === "character_first" ? `/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/type` : `/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/world-feeling`);
  }

  return <>
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      <button type="button" disabled={!householdId || saving !== null} onClick={() => void choose("character_first")} className="text-left rounded-[28px] border border-[#d9cbb8] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"><span className="text-4xl">🧭</span><h2 className="mt-5 font-serif text-2xl font-black">Karakterimi seçmek istiyorum</h2><p className="mt-3 leading-7 text-[#65584d]">Karakteri seçelim; sonra ona yakışan dünyaları ve bölgeleri keşfedelim.</p><span className="mt-6 inline-flex font-extrabold text-[#1f7a70]">{saving === "character_first" ? "Kaydediliyor…" : "Karakterden başla →"}</span></button>
      <button type="button" disabled={!householdId || saving !== null} onClick={() => void choose("world_first")} className="text-left rounded-[28px] border border-[#d9cbb8] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"><span className="text-4xl">🌎</span><h2 className="mt-5 font-serif text-2xl font-black">Dünyamı seçmek istiyorum</h2><p className="mt-3 leading-7 text-[#65584d]">Önce dünyanın doğasını seçelim; sonra oraya ait karakterler bulalım.</p><span className="mt-6 inline-flex font-extrabold text-[#1f7a70]">{saving === "world_first" ? "Kaydediliyor…" : "Dünyadan başla →"}</span></button>
    </div>
    {error ? <p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}
  </>;
}
