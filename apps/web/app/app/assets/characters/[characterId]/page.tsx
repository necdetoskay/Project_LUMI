import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import {
  getOwnedHousehold,
  listCharactersByHousehold,
} from "@lumi/profiles/application";
import { CharacterVisualManager } from "./character-visual-manager";

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

  return (
    <section className="storybook-page min-h-full">
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

        <header className="overflow-hidden rounded-[1.6rem] border border-outline-variant/70 bg-white/90 shadow-sm md:rounded-[2rem]">
          <div className="grid md:grid-cols-[300px_1fr]">
            <div className="grid min-h-72 place-items-center bg-gradient-to-br from-primary-fixed/70 via-surface-container-low to-tertiary-fixed/50 p-8">
              <div className="grid size-36 place-items-center rounded-full border border-white/70 bg-white/75 shadow-sm">
                <span className="material-symbols-outlined text-7xl text-primary">
                  person
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Character Visual Hub
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-on-surface md:text-4xl">
                {character.name}
              </h1>
              <p className="mt-2 font-bold text-on-surface-variant">
                {character.subtype || "Karakter"}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
                {character.originConcept ||
                  "Bu karakterin temel görsel kimliği, görünüm varyantları ve hikâyelere bağlı görsel setleri burada yönetilecek."}
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-xl">
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-2xl font-black text-on-surface">—</p>
                  <p className="mt-1 text-xs font-bold text-on-surface-variant">
                    Hikâye
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-2xl font-black text-on-surface">—</p>
                  <p className="mt-1 text-xs font-bold text-on-surface-variant">
                    Outfit
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    photo_library
                  </span>
                  <p className="mt-1 text-xs font-bold text-on-surface-variant">
                    Görsel kimlik
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:p-6">
          <CharacterVisualManager
            characterId={character.id}
            characterName={character.name}
            householdId={household.id}
          />
        </section>

        <section className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                Hikâyeler
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-on-surface">
                {character.name} hikâyeleri
              </h2>
            </div>
            <span className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-extrabold text-on-surface-variant">
              Slice C
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Hikâye kartları bu alanda görsel stil, eşya/ortam/sahne sayıları ve
            hazır/eksik görsel durumuyla listelenecek. Bir karta tıklamak Story
            Visual Workspace'i açacak.
          </p>
          <div className="mt-5 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-primary">
              auto_stories
            </span>
            <p className="mt-3 font-extrabold text-on-surface">
              Gerçek hikâye kartları sıradaki slice'ta bağlanacak
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
