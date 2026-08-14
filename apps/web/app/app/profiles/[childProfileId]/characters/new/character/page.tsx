import Link from "next/link";

export default async function CharacterCandidateBoundaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ childProfileId: string }>;
  searchParams: Promise<{ characterType?: string }>;
}) {
  const { childProfileId } = await params;
  const { characterType } = await searchParams;
  const typeHref = `/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/type`;

  return (
    <main className="min-h-screen bg-[#f8f4ea] px-4 py-10 text-[#34281f]">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-[#e4d8c7] bg-[#fffdf7] p-7 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1f7a70]">
          2. adım · Karakter
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          Karakter fikirleri burada başlayacak
        </h1>
        <p className="mt-4 text-base leading-7 text-[#65584d]">
          İlk adım başarıyla tamamlandı. Seçilen karakter tipi
          {characterType ? `: ${characterType}` : ""}. Bu ekran Phase 2'de gerçek aday üretimiyle tamamlanacak.
        </p>
        <Link
          href={typeHref}
          className="mt-7 inline-flex rounded-2xl border border-[#dfd2be] bg-white px-5 py-3 font-extrabold text-[#51463d]"
        >
          ← Karakter tipine dön
        </Link>
      </section>
    </main>
  );
}
