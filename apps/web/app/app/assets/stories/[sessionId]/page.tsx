import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { loadStoryVisualWorkspace } from "@lumi/media/application";
import {
  DrizzleStoryVisualWorkspaceRepository,
  getMediaDb,
} from "@lumi/media/db";
import {
  getOwnedHousehold,
  listCharactersByHousehold,
} from "@lumi/profiles/application";
import {
  getSessionById,
  getSessionPlaybackState,
  getStoryDefinitionById,
  getStoryVersionById,
} from "@lumi/story/application";

const workspaceSections = [
  ["Genel Bakış", "dashboard"],
  ["Karakterler", "group"],
  ["Eşyalar", "backpack"],
  ["Ortamlar", "landscape"],
  ["Sahneler", "auto_stories"],
] as const;

function sessionStatusLabel(status: string) {
  if (status === "completed") return "Tamamlandı";
  if (status === "paused") return "Duraklatıldı";
  if (status === "abandoned") return "Arşivlendi";
  return "Devam ediyor";
}

function renderStatusLabel(status: string) {
  if (status === "ready") return "Hazır";
  if (status === "reused") return "Yeniden kullanıldı";
  if (status === "generating") return "Üretiliyor";
  if (status === "failed") return "Başarısız";
  if (status === "planned") return "Planlandı";
  return "Eksik";
}

export default async function StoryVisualWorkspacePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");

  const household = await getOwnedHousehold(parent.id);
  if (!household) redirect("/app/onboarding");

  const { sessionId } = await params;
  const session = await getSessionById(sessionId).catch(() => null);
  if (!session || session.householdId !== household.id) notFound();

  const [definition, version, playback, characters] = await Promise.all([
    getStoryDefinitionById(session.storyDefinitionId),
    getStoryVersionById(session.storyVersionId),
    getSessionPlaybackState(session.id),
    listCharactersByHousehold(parent.id, household.id),
  ]);

  const visualRepository = new DrizzleStoryVisualWorkspaceRepository(
    getMediaDb(),
  );
  const scope = {
    householdId: session.householdId,
    childProfileId: session.childProfileId,
    worldId: session.worldId,
  };

  let visualWorkspace = await loadStoryVisualWorkspace({
    repository: visualRepository,
    storyId: session.id,
    scope,
  }).catch(() => null);

  if (!visualWorkspace?.manifest) {
    const definitionWorkspace = await loadStoryVisualWorkspace({
      repository: visualRepository,
      storyId: session.storyDefinitionId,
      scope,
    }).catch(() => null);
    if (definitionWorkspace?.manifest) visualWorkspace = definitionWorkspace;
  }

  const participantNames = playback.characters.map((participant) => {
    const character = characters.find(
      (entry) => entry.id === participant.characterId,
    );
    return character?.name ?? "Karakter";
  });
  const primaryCharacterId = playback.characters[0]?.characterId ?? null;
  const counts = visualWorkspace?.counts ?? {
    characters: participantNames.length,
    items: 0,
    environments: 0,
    scenes: playback.visits.length,
    total: 0,
    ready: 0,
    missing: 0,
    generating: 0,
    failed: 0,
  };
  const requirements = visualWorkspace?.requirements ?? [];
  const entityRequirements = requirements.filter(
    (requirement) => requirement.targetKind === "entity-render",
  );
  const sceneRequirements = requirements.filter(
    (requirement) => requirement.targetKind === "story-illustration",
  );
  const missingRequirements = requirements.filter(
    (requirement) =>
      requirement.status !== "ready" && requirement.status !== "reused",
  );
  const selectedStyle = visualWorkspace?.assetSet
    ? `${visualWorkspace.assetSet.styleId} v${visualWorkspace.assetSet.styleVersion}`
    : "Henüz seçilmedi";

  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-3 py-4 sm:px-4 md:px-6 md:py-10">
        <div className="flex flex-wrap items-center gap-3 text-sm font-extrabold">
          {primaryCharacterId ? (
            <Link
              className="inline-flex items-center gap-2 text-primary hover:underline"
              href={`/app/assets/characters/${encodeURIComponent(primaryCharacterId)}`}
            >
              <span className="material-symbols-outlined text-lg">
                arrow_back
              </span>
              Karaktere dön
            </Link>
          ) : (
            <Link className="text-primary hover:underline" href="/app/assets">
              Görsel Kütüphanesi
            </Link>
          )}
        </div>

        <header className="overflow-hidden rounded-[1.7rem] border border-outline-variant/70 bg-white/90 shadow-sm md:rounded-[2rem]">
          <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
            <div className="p-6 md:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Story Visual Workspace
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-on-surface md:text-4xl">
                {definition.title || version.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-on-surface-variant">
                Bu çalışma alanı yalnızca bu hikâyenin görsel dünyasını yönetir.
                Karakter varyantları, somut eşyalar, ortamlar ve sahne
                illüstrasyonları Story Visual Manifest üzerinden ayrı ayrı
                izlenir.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-on-surface-variant">
                <span className="rounded-full bg-surface-container px-3 py-1.5">
                  {version.storyMode === "interactive"
                    ? "Etkileşimli hikâye"
                    : "Hikâye"}
                </span>
                <span className="rounded-full bg-surface-container px-3 py-1.5">
                  {sessionStatusLabel(session.sessionStatus)}
                </span>
                <span className="rounded-full bg-surface-container px-3 py-1.5">
                  Stil: {selectedStyle}
                </span>
                <span className="rounded-full bg-surface-container px-3 py-1.5">
                  {visualWorkspace?.manifest
                    ? "Manifest bağlı"
                    : "Manifest yok"}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-fixed/55 via-tertiary-fixed/50 to-surface-container p-6 md:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">
                Görsel hazırlık
              </p>
              <p className="mt-2 text-3xl font-black text-on-surface">
                {counts.ready} / {counts.total}
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {visualWorkspace?.manifest
                  ? `${counts.missing} görsel henüz hazır değil. ${counts.generating} üretimde, ${counts.failed} başarısız.`
                  : "Bu hikâye için Story Visual Manifest henüz oluşturulmamış."}
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:flex-col">
                <button className="storybook-button" disabled type="button">
                  Eksik görselleri oluştur ({counts.missing})
                </button>
                <button
                  className="storybook-button-secondary"
                  disabled
                  type="button"
                >
                  Görsel stilini değiştir
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav
          aria-label="Hikâye görsel bölümleri"
          className="grid grid-cols-2 gap-2 rounded-[1.4rem] border border-outline-variant/70 bg-white/90 p-2 shadow-sm sm:grid-cols-5"
        >
          {workspaceSections.map(([label, icon], index) => (
            <button
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold ${
                index === 0
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant"
              }`}
              key={label}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.42fr)]">
          <article className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              Genel Bakış
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
              Hikâyenin görsel haritası
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Karakter", counts.characters, "group"],
                ["Eşya", counts.items, "backpack"],
                ["Ortam", counts.environments, "landscape"],
                ["Sahne", counts.scenes, "auto_stories"],
              ].map(([label, value, icon]) => (
                <div
                  className="rounded-2xl bg-surface-container-low p-4"
                  key={String(label)}
                >
                  <span className="material-symbols-outlined text-primary">
                    {icon}
                  </span>
                  <p className="mt-3 text-2xl font-black text-on-surface">
                    {value}
                  </p>
                  <p className="mt-1 text-xs font-bold text-on-surface-variant">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {visualWorkspace?.manifest ? (
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-extrabold text-on-surface">
                      Somut entity görselleri
                    </p>
                    <span className="text-xs font-bold text-on-surface-variant">
                      {entityRequirements.length} render gereksinimi
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {entityRequirements.map((requirement) => (
                      <div
                        className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4"
                        key={requirement.key}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-on-surface">
                              {requirement.displayName}
                            </p>
                            <p className="mt-1 text-xs font-bold text-on-surface-variant">
                              {requirement.entityKind === "character"
                                ? "Karakter"
                                : requirement.entityKind === "item"
                                  ? "Eşya"
                                  : "Ortam"}
                              {requirement.variantLabel
                                ? ` · ${requirement.variantLabel}`
                                : ""}
                              {requirement.stateLabel
                                ? ` · ${requirement.stateLabel}`
                                : ""}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-on-surface-variant">
                            {renderStatusLabel(requirement.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-extrabold text-on-surface">
                      Sahne illüstrasyonları
                    </p>
                    <span className="text-xs font-bold text-on-surface-variant">
                      {sceneRequirements.length} sahne
                    </span>
                  </div>
                  {sceneRequirements.length === 0 ? (
                    <p className="mt-3 rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                      Manifest bu hikâye için ayrı bir sahne illüstrasyonu
                      istemiyor.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {sceneRequirements.map((requirement) => (
                        <div
                          className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4"
                          key={requirement.key}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-bold leading-6 text-on-surface">
                              {requirement.displayName}
                            </p>
                            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-on-surface-variant">
                              {renderStatusLabel(requirement.status)}
                            </span>
                          </div>
                          {requirement.sceneId ? (
                            <p className="mt-2 text-xs font-bold text-on-surface-variant">
                              Sahne: {requirement.sceneId}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-5">
                <p className="font-extrabold text-on-surface">
                  Story Visual Manifest bekleniyor
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Manifest oluştuğunda karakter varyantları, eşya state'leri,
                  ortamlar ve sahne illüstrasyonları burada otomatik olarak
                  ayrı gereksinimler halinde görünecek.
                </p>
              </div>
            )}
          </article>

          <aside className="space-y-5">
            <div className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Eksik görseller
              </p>
              <p className="mt-2 text-2xl font-black text-on-surface">
                {missingRequirements.length}
              </p>
              <div className="mt-4 space-y-2">
                {missingRequirements.slice(0, 8).map((requirement) => (
                  <div
                    className="rounded-xl bg-surface-container-low p-3"
                    key={`missing:${requirement.key}`}
                  >
                    <p className="text-sm font-extrabold text-on-surface">
                      {requirement.displayName}
                    </p>
                    <p className="mt-1 text-xs font-bold text-on-surface-variant">
                      {requirement.variantLabel ||
                        requirement.stateLabel ||
                        (requirement.targetKind === "story-illustration"
                          ? "Sahne illüstrasyonu"
                          : "Temel render")}
                      {` · ${renderStatusLabel(requirement.status)}`}
                    </p>
                  </div>
                ))}
                {missingRequirements.length === 0 ? (
                  <p className="rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
                    {visualWorkspace?.manifest
                      ? "Tüm görsel gereksinimleri hazır."
                      : "Manifest olmadığı için çözümlenecek görsel listesi henüz yok."}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Hikâye karakterleri
              </p>
              <div className="mt-4 space-y-3">
                {playback.characters.map((participant, index) => {
                  const character = characters.find(
                    (entry) => entry.id === participant.characterId,
                  );
                  return (
                    <div
                      className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-3"
                      key={participant.characterId}
                    >
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-primary">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-on-surface">
                          {character?.name ?? `Karakter ${index + 1}`}
                        </p>
                        <p className="text-xs font-bold text-on-surface-variant">
                          {participant.participationRole}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </section>
  );
}
