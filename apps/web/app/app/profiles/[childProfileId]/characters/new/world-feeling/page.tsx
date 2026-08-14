"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS = [
  { key: "oceanic", icon: "🌊", title: "Sonsuz Okyanuslar", text: "Adalar, mercan şehirleri ve derin sularda yaşayan gizemli canlılar." },
  { key: "sky_islands", icon: "☁️", title: "Gökyüzü Adaları", text: "Bulutların üzerinde süzülen kara parçaları, rüzgâr yolları ve uçan yaşam." },
  { key: "enchanted_forest", icon: "🌲", title: "Büyülü Orman", text: "Konuşan ağaçlar, ışıklı patikalar ve saklı orman toplulukları." },
  { key: "crystal_caverns", icon: "💎", title: "Kristal Mağaraları", text: "Işıldayan kristaller, yeraltı nehirleri ve taşların arasında gelişen yaşam." },
  { key: "desert_ruins", icon: "🏜️", title: "Kadim Çöl", text: "Kum denizleri, kayıp şehirler ve geceleri canlanan eski sırlar." },
  { key: "living_city", icon: "🏙️", title: "Yaşayan Şehir", text: "Kendi ritmi olan sokaklar, sıra dışı mahalleler ve keşfedilecek binlerce hikâye." },
] as const;

type Key = (typeof OPTIONS)[number]["key"];
export default function WorldFeelingPage() {
  const params = useParams<{ childProfileId: string }>(); const router = useRouter();
  const childProfileId = params.childProfileId; const [selected, setSelected] = useState<Key | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function next() { if (!selected) return; setSaving(true); setError(null); try { const onboarding = await fetch("/api/onboarding"); const ob = await onboarding.json() as { onboarding?: { householdId?: string | null } }; const householdId=ob.onboarding?.householdId; if(!householdId) throw new Error("Aile alanı bulunamadı."); const response=await fetch("/api/character-creation/world-feeling",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({householdId,childProfileId,feeling:selected})}); if(!response.ok) throw new Error("Dünya seçimi kaydedilemedi."); router.push(`/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/world-character`); } catch(e){setError(e instanceof Error?e.message:"Bir sorun oluştu.");} finally {setSaving(false);} }
  return <main className="min-h-screen bg-[#f8f4ea] px-4 py-8 text-[#34281f] sm:py-12"><section className="mx-auto max-w-6xl rounded-[32px] border border-[#e4d8c7] bg-[#fffdf7] p-5 shadow-sm sm:p-10"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#1f7a70]">Dünyadan başlayan yol · Dünya hissi</p><h1 className="mt-3 font-serif text-4xl font-black tracking-tight sm:text-5xl">Bu dünya nasıl bir yer olsun?</h1><p className="mt-4 max-w-3xl leading-7 text-[#65584d]">Önce dünyanın temel doğasını seç. LUMI bir sonraki adımda bu ortamda gerçekten yaşayabilecek karakter tipleri önerecek.</p><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{OPTIONS.map(o=><button key={o.key} type="button" aria-pressed={selected===o.key} onClick={()=>setSelected(o.key)} className={`rounded-[26px] border p-5 text-left transition ${selected===o.key?"border-[#1f7a70] bg-[#edf7f3] ring-2 ring-[#1f7a70]/20":"border-[#dfd2be] bg-white hover:-translate-y-0.5 hover:shadow-md"}`}><span className="text-4xl">{o.icon}</span><h2 className="mt-4 font-serif text-xl font-black">{o.title}</h2><p className="mt-2 leading-6 text-[#65584d]">{o.text}</p></button>)}</div>{error?<p className="mt-5 font-bold text-red-700">{error}</p>:null}<div className="mt-8 flex flex-wrap gap-3"><Link href={`/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/start`} className="rounded-2xl border border-[#dfd2be] bg-white px-5 py-3 font-extrabold">← Geri</Link><button type="button" disabled={!selected||saving} onClick={next} className="rounded-2xl bg-[#16786f] px-6 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">{saving?"Kaydediliyor…":"Devam et →"}</button></div></section></main>;
}
