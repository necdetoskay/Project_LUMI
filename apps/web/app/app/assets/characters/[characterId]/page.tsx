import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import {
  getOwnedHousehold,
  listCharactersByHousehold,
} from "@lumi/profiles/application";
import {
  getSessionPlaybackState,
  listSessionsForChildProfile,
} from "@lumi/story/application";
import { AssetsRuntimeDiagnostics } from "../../runtime-diagnostics";
import { CharacterIdentityHeaderServer } from "../character-identity-header.server";
import { CharacterVisualManager } from "./character-visual-manager";

function sessionStatusLabel(status: string) {
  if (status === "completed") return "Tamamlandı";
  if (status === "paused") return "Duraklatıldı";
  if (status === "abandoned") return "Arşivlendi";
  return "Devam ediyor";
}

export default async function CharacterVisualHubPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");

  const household = await getOwnedHousehold(parent.id);
  if (!household) redirect("/app/onboarding");

  const { characterId } = await params;
  const characters = await listCharactersByHousehold(parent.id, household.id);
  const character = characters.find((entry) => entry.id === characterId);
  if (!character) notFound();

  const childSessions = await listSessionsForChildProfile(
    household.id,
    character.childProfileId,
  );
  const storyCards = (
    await Promise.all(
      childSessions.map(async (entry) => {
        const playback = await getSessionPlaybackState(entry.session.id);
        const participates = playback.characters.some(
          (participant) => participant.characterId === character.id,
        );
        if (!participates) return null;
        return {
          ...entry,
          visitCount: playback.visits.length,
        };
      }),
    )
  ).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const diagnosticPayload = {
    characterResolved: true,
    characterTypeKey: character.subtype.trim().toLowerCase(),
    storyCount: storyCards.length,
  };

  console.warn("[LUMI_ASSETS_SERVER]", {
    marker: "assets-runtime-diag-2026-08-13-v1",
    route: "/app/assets/characters/[characterId]",
    ...diagnosticPayload,
  });

  return (
    <section className="storybook-page min-h-full">
      <AssetsRuntimeDiagnostics
        payload={diagnosticPayload}
        route="/app/assets/characters/[characterId]"
      />
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-3 py-4 sm:px-4 md:px-6 md:py-10">
        <div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:underline"
            href="/app/assets"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_back
            </span>
            Görsel Kütüphanesi
          </Link>
        </div>

        <CharacterIdentityHeaderServer
          character={character}
          householdId={household.id}
          parentId={parent.id}
          storyCount={storyCards.length}
        />

        <section className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:p-6">
          <CharacterVisualManager
            characterId={character.id}
            characterName={character.name}
            characterSummary={
              character.originConcept?.trim() ||
              `${character.name} için otomatik karakter özeti hazırlanıyor.`
            }
            householdId={household.id}
          />
        </section>

        <section className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Hikâyeler
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
                {character.name} hikâyeleri
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Hikâyeye girerek yalnızca o maceraya ait karakter, eşya, ortam
                ve sahne görsellerini yönetebilirsin.
              </p>
            </div>
            <span className="w-fit rounded-full bg-primary-fixed px-3 py-1.5 text-xs font-extrabold text-on-primary-fixed-variant">
              {storyCards.length} hikâye
            </span>
          </div>

          {storyCards.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-7 text-center">
              <span className="material-symbols-outlined text-4xl text-primary">
                auto_stories
              </span>
              <p className="mt-3 font-extrabold text-on-surface">
                Bu karaktere bağlı bir hikâye oturumu henüz yok
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
                Karakter bir hikâyeye katıldığında görsel çalışma alanı burada
                otomatik olarak görünecek.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {storyCards.map((entry) => (
                <Link
                  className="group overflow-hidden rounded-[1.4rem] border border-outline-variant/70 bg-surface-container-low transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  href={`/app/assets/stories/${encodeURIComponent(entry.session.id)}`}
                  key={entry.session.id}
                >
                  <div className="grid min-h-40 place-items-center bg-gradient-to-br from-tertiary-fixed/60 via-primary-fixed/50 to-surface-container p-5">
                    <div className="grid size-16 place-items-center rounded-full bg-white/80 text-primary shadow-sm">
                      <span className="material-symbols-outlined text-3xl">
                        auto_stories
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
                          {entry.version?.storyMode === "interactive"
                            ? "Etkileşimli hikâye"
                            : "Hikâye"}
                        </p>
                        <h3 className="mt-1 text-xl font-extrabold text-on-surface">
                          {entry.definition?.title ||
                            entry.version?.title ||
                            "İsimsiz hikâye"}
                        </h3>
                      </div>
                      <span className="material-symbols-outlined text-primary transition-transform group-hover:translate-x-1">
                        arrow_forward
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-on-surface-variant">
                      <span className="rounded-full bg-white px-3 py-1.5">
                        Stil: henüz seçilmedi
                      </span>
                      <span className="rounded-full bg-white px-3 py-1.5">
                        {entry.visitCount} sahne ziyareti
                      </span>
                      <span className="rounded-full bg-white px-3 py-1.5">
                        {sessionStatusLabel(entry.session.sessionStatus)}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border border-outline-variant/60 bg-white/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-extrabold text-on-surface">
                          Görsel hazırlık
                        </p>
                        <span className="text-xs font-extrabold text-on-surface-variant">
                          Manifest bekliyor
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                        Eşya, ortam ve sahne adetleri Story Visual Manifest
                        bağlandığında bu kartta canlı olarak gösterilecek.
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
