import Link from "next/link";

type CharacterOption = {
  id: string;
  name: string;
  subtype: string;
  originConcept: string;
};

function CharacterCard({ character }: { character: CharacterOption }) {
  const summary = character.originConcept?.trim() || character.subtype;

  return (
    <Link
      className="group overflow-hidden rounded-[1.6rem] border border-outline-variant/70 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      href={`/app/assets/characters/${encodeURIComponent(character.id)}`}
    >
      <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-primary-fixed/70 via-surface-container-low to-tertiary-fixed/50">
        <div className="grid size-24 place-items-center rounded-full border border-white/70 bg-white/75 shadow-sm">
          <span className="material-symbols-outlined text-5xl text-primary">
            person
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              {character.subtype || "Karakter"}
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-on-surface">
              {character.name}
            </h2>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant transition group-hover:translate-x-1 group-hover:text-primary">
            arrow_forward
          </span>
        </div>

        <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-on-surface-variant">
          {summary ||
            "Bu karakterin görsel kimliği, görünüm varyantları ve hikâye görselleri burada yönetilir."}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-container-low px-2 py-3">
            <p className="text-lg font-black text-on-surface">—</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Hikâye
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low px-2 py-3">
            <p className="text-lg font-black text-on-surface">—</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Görünüm
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low px-2 py-3">
            <span className="material-symbols-outlined text-xl text-primary">
              pending
            </span>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Durum
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function VisualLibraryV3({
  householdId,
  characters,
}: {
  householdId: string | null;
  characters: CharacterOption[];
}) {
  if (!householdId) {
    return (
      <section className="storybook-page min-h-full">
        <div className="mx-auto w-full max-w-[920px] px-5 py-10">
          <div className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-8">
            <h1 className="text-3xl font-extrabold text-on-surface">
              Görsel Kütüphanesi
            </h1>
            <p className="mt-3 text-on-surface-variant">
              Önce aile alanınızı oluşturun; karakter ve hikâye görselleriniz
              daha sonra burada toplanacak.
            </p>
            <Link className="storybook-button mt-6" href="/app/onboarding">
              Aile alanını hazırla
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-3 py-4 sm:px-4 md:px-6 md:py-10">
        <header className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Visual Library v3
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-on-surface md:text-4xl">
                Görsel Kütüphanesi
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base md:leading-7">
                Önce karakterini seç. Karakterin görsel kimliğini ve ona ait
                hikâyeleri buradan aç; eşya, ortam ve sahne görsellerini ise
                ilgili hikâyenin kendi görsel çalışma alanında yönet.
              </p>
            </div>
            <Link
              aria-label="Aile evine dön"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant bg-white text-on-surface shadow-sm md:size-auto md:px-4 md:py-3"
              href="/app"
            >
              <span className="material-symbols-outlined text-xl md:hidden">
                arrow_back
              </span>
              <span className="hidden font-extrabold md:inline">
                Aile evine dön
              </span>
            </Link>
          </div>
        </header>

        <section className="rounded-[1.5rem] border border-primary/15 bg-primary-fixed/35 p-5 md:rounded-[2rem] md:p-6">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined mt-0.5 text-3xl text-primary">
              route
            </span>
            <div>
              <p className="font-extrabold text-on-surface">
                Yeni görsel akışı
              </p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Karakter → Hikâyeler → Hikâye Görselleri. Çanta artık ayrı bir
                alan değildir; ilgili hikâyedeki diğer eşyalar gibi kendi state
                görselleriyle yönetilir.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Karakterler
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-on-surface">
                Görsel dünyasını yönetmek istediğin karakteri seç
              </h2>
            </div>
            <span className="w-fit rounded-full bg-surface-container px-3 py-1.5 text-xs font-extrabold text-on-surface-variant">
              {characters.length} karakter
            </span>
          </div>

          {characters.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {characters.map((character) => (
                <CharacterCard character={character} key={character.id} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-outline-variant bg-white/75 p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-primary">
                person_add
              </span>
              <h3 className="mt-3 text-xl font-extrabold text-on-surface">
                Henüz karakter yok
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-on-surface-variant">
                Bir karakter oluşturduğunda görsel kimliği ve hikâyeleri burada
                kart olarak görünecek.
              </p>
              <Link className="storybook-button mt-5" href="/app">
                Karakter oluştur
              </Link>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
