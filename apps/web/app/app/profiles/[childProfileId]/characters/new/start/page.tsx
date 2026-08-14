import Link from "next/link";
import { StartDirectionClient } from "./start-direction-client";

export default async function CharacterStartDirectionPage({ params }: { params: Promise<{ childProfileId: string }> }) {
  const { childProfileId } = await params;
  return <main className="min-h-screen bg-[#f8f4ea] px-4 py-8 text-[#34281f] sm:py-12"><section className="mx-auto max-w-5xl rounded-[32px] border border-[#e4d8c7] bg-[#fffdf7] p-5 shadow-sm sm:p-10">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1f7a70]">Yeni karakter · Başlangıç</p>
    <h1 className="mt-3 max-w-2xl font-serif text-4xl font-black tracking-tight sm:text-5xl">Önce neyi hayal edelim?</h1>
    <p className="mt-4 max-w-2xl text-base leading-7 text-[#65584d]">İstersen karakterinden başlayalım, istersen önce yaşayacağı dünyayı keşfedelim. Seçimin taslak olarak kaydedilir; yarıda bırakırsan daha sonra devam edebiliriz.</p>
    <StartDirectionClient childProfileId={childProfileId} />
    <Link href={`/app/profiles/${encodeURIComponent(childProfileId)}`} className="mt-8 inline-flex rounded-2xl border border-[#dfd2be] bg-white px-5 py-3 font-extrabold text-[#51463d]">Vazgeç</Link>
  </section></main>;
}
