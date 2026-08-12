"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CanonicalBagImage } from "@/components/assets/canonical-bag-image";
import { CanonicalItemImage } from "@/components/assets/canonical-item-image";
import { AssetsClientPage } from "./assets-client-page";

type CharacterOption = {
  id: string;
  name: string;
  subtype: string;
  originConcept: string;
};

type InventoryItem = {
  id: string;
  displayName: string;
  category: string;
  rarity: string;
};

type LibraryTab = "stories" | "characters" | "items" | "environments";

const tabs: readonly [LibraryTab, string, string][] = [
  ["stories", "Hikâyeler", "auto_stories"],
  ["characters", "Karakterler", "person"],
  ["items", "Eşyalar", "category"],
  ["environments", "Ortamlar", "landscape"],
];

export function VisualLibraryV2({
  householdId,
  characters,
}: {
  householdId: string | null;
  characters: CharacterOption[];
}) {
  const [activeTab, setActiveTab] = useState<LibraryTab>("stories");
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? "");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === characterId) ?? null,
    [characterId, characters],
  );

  useEffect(() => {
    if (!householdId || !characterId) {
      setItems([]);
      return;
    }

    const controller = new AbortController();
    setLoadingItems(true);
    void fetch(
      `/api/inventory/list?householdId=${encodeURIComponent(householdId)}&ownerType=character&ownerId=${encodeURIComponent(characterId)}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { items?: InventoryItem[] })
          : { items: [] },
      )
      .then((payload) => {
        if (!controller.signal.aborted) setItems(payload.items ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingItems(false);
      });

    return () => controller.abort();
  }, [characterId, householdId]);

  if (!householdId) {
    return (
      <section className="storybook-page min-h-full">
        <div className="mx-auto w-full max-w-[920px] px-5 py-10">
          <div className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-8">
            <h1 className="text-3xl font-extrabold text-on-surface">
              Görsel Kütüphanesi
            </h1>
            <p className="mt-3 text-on-surface-variant">
              Önce aile alanınızı oluşturun; hikâye ve evren görselleri daha
              sonra burada toplanacak.
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
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-3 py-4 sm:px-4 md:gap-7 md:px-6 md:py-10">
        <header className="rounded-[1.5rem] border border-outline-variant/70 bg-white/85 p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Visual Library v2
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-on-surface md:text-4xl">
                Görsel Kütüphanesi
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base md:leading-7">
                Görseller artık üretim aracına göre değil; hikâye, karakter,
                eşya ve ortam kimliğine göre yönetiliyor. Çanta ayrı bir sistem
                değil, diğer eşyalar gibi state sahibi bir assettir.
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

        <section className="sticky top-0 z-30 -mx-3 border-y border-outline-variant/70 bg-surface/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 md:static md:mx-0 md:rounded-[1.5rem] md:border md:bg-white/85 md:p-4 md:shadow-sm">
          <div className="grid grid-cols-4 gap-2" role="tablist">
            {tabs.map(([value, label, icon]) => (
              <button
                aria-selected={activeTab === value}
                className={`min-h-12 rounded-xl border px-2 py-2 text-[11px] font-extrabold transition md:rounded-2xl md:text-sm ${activeTab === value ? "border-primary bg-primary text-on-primary shadow-md" : "border-outline-variant bg-white text-on-surface hover:border-primary"}`}
                key={value}
                onClick={() => setActiveTab(value)}
                role="tab"
                type="button"
              >
                <span className="material-symbols-outlined mr-1 align-middle text-base md:text-lg">
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </div>
        </section>

        {activeTab !== "stories" ? (
          <section className="rounded-[1.3rem] border border-outline-variant/70 bg-white/85 p-4 shadow-sm md:rounded-[1.6rem] md:p-5">
            <label className="block max-w-md text-sm font-extrabold text-on-surface">
              Karakter bağlamı
              <select
                className="mt-2 w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 font-medium text-on-surface"
                value={characterId}
                onChange={(event) => setCharacterId(event.target.value)}
              >
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        {activeTab === "stories" ? (
          <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-6 shadow-sm md:rounded-[2rem] md:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Hikâye görsel setleri
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-on-surface md:text-3xl">
                Görsellerin ana merkezi artık hikâye
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
                Story Visual Manifest bir hikâyede hangi karakter, eşya, state,
                kıyafet varyantı, ortam ve sahne görselinin gerektiğini
                tanımlar. Aynı hikâye daha sonra farklı bir görsel stille yeni
                bir asset set olarak yeniden üretilebilir.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["inventory_2", "Reusable assetler", "Karakter, eşya ve ortamlar yeniden kullanılabilir."],
                  ["layers", "State & variant", "Açık/kapalı, dolu/boş ve kıyafet varyantları ayrı tutulur."],
                  ["palette", "Çoklu stil", "Aynı manifest farklı görsel stillerde render edilebilir."],
                ].map(([icon, title, text]) => (
                  <div
                    className="rounded-2xl bg-surface-container-low p-4"
                    key={title}
                  >
                    <span className="material-symbols-outlined text-primary">
                      {icon}
                    </span>
                    <p className="mt-2 font-extrabold text-on-surface">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-5">
                <p className="font-extrabold text-on-surface">
                  Hikâye kartları bir sonraki bağlantı adımında burada görünecek.
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Veri modeli hazır. Sıradaki web slice, mevcut ve yeni
                  hikâyeleri Story Visual Asset Set kayıtlarıyla bu sekmeye
                  bağlayacak.
                </p>
              </div>
            </article>

            <aside className="rounded-[1.5rem] border border-primary/20 bg-primary-fixed/40 p-6 md:rounded-[2rem] md:p-7">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Yeni akış
              </p>
              <div className="mt-4 space-y-3 text-sm text-on-surface">
                {[
                  "Hikâye oluşturulur ve Visual Manifest çıkarılır.",
                  "Mevcut assetler bulunur, yalnızca eksikler planlanır.",
                  "Hikâye kaydedildikten sonra görseller arka planda hazırlanır.",
                  "Kullanıcı isterse aynı hikâyeyi başka stille yeniden üretir.",
                ].map((step, index) => (
                  <div className="flex gap-3" key={step}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-on-primary">
                      {index + 1}
                    </span>
                    <p className="leading-6">{step}</p>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        ) : null}

        {activeTab === "characters" ? (
          <section className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              Karakter katalogu
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
              {selectedCharacter?.name ?? "Karakter"} ve görünüm varyantları
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Canon karakter kimliği sabit kalır; çöl kıyafeti, kış kıyafeti
              veya başka appearance variantları aynı karakter altında ayrı
              render setleri olarak tutulur.
            </p>
            <details className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
              <summary className="cursor-pointer font-extrabold text-on-surface">
                Gelişmiş karakter üretim ve canon araçlarını aç
              </summary>
              <p className="mt-2 text-sm text-on-surface-variant">
                Mevcut karakter aday üretimi ve canon seçim araçları geçiş
                süresince burada korunuyor.
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant bg-white">
                <AssetsClientPage householdId={householdId} characters={characters} />
              </div>
            </details>
          </section>
        ) : null}

        {activeTab === "items" ? (
          <section className="space-y-5">
            <article className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                    Eşya katalogu
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
                    Eşyalar ve görsel durumları
                  </h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Çanta artık ayrı bir bölüm değil. Diğer eşyalar gibi açık,
                    kapalı veya başka anlamlı state'leri olan bir asset olarak
                    aynı katalogda yer alıyor.
                  </p>
                </div>
                <span className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-extrabold text-on-surface-variant">
                  {loadingItems ? "Yükleniyor…" : `${items.length + 1} kayıt`}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                <article className="rounded-[1.2rem] border border-outline-variant bg-white p-3">
                  <CanonicalBagImage
                    characterId={characterId}
                    householdId={householdId}
                    characterName={selectedCharacter?.name ?? "Karakter"}
                    variant="bag-closed"
                    className="aspect-square rounded-xl"
                  />
                  <p className="mt-3 font-extrabold text-on-surface">
                    {selectedCharacter?.name ?? "Karakter"} çantası
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Çanta · state seti
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-extrabold text-on-primary-fixed-variant">
                      Kapalı
                    </span>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-extrabold text-on-surface-variant">
                      Açık
                    </span>
                  </div>
                </article>

                {items.map((item) => (
                  <article
                    className="rounded-[1.2rem] border border-outline-variant bg-white p-3"
                    key={item.id}
                  >
                    <CanonicalItemImage
                      itemId={item.id}
                      householdId={householdId}
                      itemName={item.displayName}
                      className="aspect-square rounded-xl"
                      sizes="260px"
                    />
                    <p className="mt-3 line-clamp-2 font-extrabold text-on-surface">
                      {item.displayName}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {item.category} · {item.rarity}
                    </p>
                    <div className="mt-3">
                      <span className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-extrabold text-on-surface-variant">
                        State seti
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "environments" ? (
          <section className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-6 shadow-sm md:rounded-[2rem] md:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              Ortam katalogu
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-on-surface md:text-3xl">
              Mekânlar ve condition variantları
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-on-surface-variant">
              Aynı fiziksel ortam gündüz, gece, yağmur, kış veya festival gibi
              condition variantlarıyla yeniden render edilebilir. Ortam entity
              kimliği değişmez; yalnızca görsel varyantı değişir.
            </p>
            <div className="mt-6 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-primary/60">
                landscape
              </span>
              <p className="mt-3 font-extrabold text-on-surface">
                Ortam assetleri Story Visual Manifest bağlantısıyla burada
                listelenecek.
              </p>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
