import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

type CharacterOption = {
  id: string;
  name: string;
  subtype: string;
  startingLocation: string;
  currentLocationName: string | null;
  selectedAssetId: string | null;
};

type CharacterTypeKey =
  | "child"
  | "human"
  | "animal"
  | "fantasy"
  | "generic";

function characterTypeKey(subtype: string): CharacterTypeKey {
  const normalized = subtype.trim().toLowerCase();
  if (normalized === "child" || normalized === "child_avatar") return "child";
  if (normalized === "human") return "human";
  if (normalized === "animal") return "animal";
  if (normalized === "fantastic" || normalized === "fantasy") return "fantasy";
  return "generic";
}

function looksLikeTechnicalIdentifier(value: string) {
  const normalized = value.trim();
  return (
    normalized.includes("_") ||
    (/^[a-z0-9-]+$/.test(normalized) && normalized.includes("-"))
  );
}

function canonicalLocationLabel(character: CharacterOption) {
  const currentLocation = character.currentLocationName?.trim();
  if (currentLocation) return currentLocation;

  const startingLocation = character.startingLocation?.trim();
  if (startingLocation && !looksLikeTechnicalIdentifier(startingLocation)) {
    return startingLocation;
  }

  return null;
}

type CardCopy = {
  location: string;
  locationPending: string;
  story: string;
  appearance: string;
  status: string;
  imageAlt: string;
};

function CharacterCard({
  character,
  householdId,
  typeLabel,
  copy,
}: {
  character: CharacterOption;
  householdId: string;
  typeLabel: string;
  copy: CardCopy;
}) {
  const locationLabel =
    canonicalLocationLabel(character) ?? copy.locationPending;
  const selectedImageUrl = character.selectedAssetId
    ? `/api/assets/characters/${encodeURIComponent(character.id)}/content/${encodeURIComponent(character.selectedAssetId)}?householdId=${encodeURIComponent(householdId)}`
    : null;

  return (
    <Link
      className="group overflow-hidden rounded-[1.75rem] border border-outline-variant/70 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      href={`/app/assets/characters/${encodeURIComponent(character.id)}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary-fixed/70 via-surface-container-low to-tertiary-fixed/50">
        {selectedImageUrl ? (
          <Image
            alt={copy.imageAlt.replace("{name}", character.name)}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            src={selectedImageUrl}
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center">
            <div className="grid size-24 place-items-center rounded-full border border-white/70 bg-white/75 shadow-sm">
              <span className="material-symbols-outlined text-5xl text-primary">
                person
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              {typeLabel}
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-on-surface">
              {character.name}
            </h2>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant transition group-hover:translate-x-1 group-hover:text-primary">
            arrow_forward
          </span>
        </div>

        <div className="mt-3 flex min-h-[4.5rem] items-start gap-2 text-sm leading-6 text-on-surface-variant">
          <span
            aria-hidden="true"
            className="material-symbols-outlined mt-0.5 text-lg text-primary"
          >
            location_on
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-on-surface-variant/80">
              {copy.location}
            </p>
            <p className="line-clamp-2 font-semibold text-on-surface-variant">
              {locationLabel}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-container-low px-2 py-3">
            <p className="text-lg font-black text-on-surface">—</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              {copy.story}
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low px-2 py-3">
            <p className="text-lg font-black text-on-surface">—</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              {copy.appearance}
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low px-2 py-3">
            <span className="material-symbols-outlined text-xl text-primary">
              pending
            </span>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              {copy.status}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export async function VisualLibrary({
  householdId,
  characters,
}: {
  householdId: string | null;
  characters: CharacterOption[];
}) {
  const t = await getTranslations("assets");

  if (!householdId) {
    return (
      <section className="storybook-page min-h-full">
        <div className="mx-auto w-full max-w-[920px] px-5 py-10">
          <div className="rounded-[2rem] border border-outline-variant/70 bg-white/85 p-8">
            <h1 className="text-3xl font-extrabold text-on-surface">
              {t("libraryTitle")}
            </h1>
            <p className="mt-3 text-on-surface-variant">
              {t("noHouseholdText")}
            </p>
            <Link className="storybook-button mt-6" href="/app/onboarding">
              {t("prepareHousehold")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const copy: CardCopy = {
    location: t("location"),
    locationPending: t("locationPending"),
    story: t("story"),
    appearance: t("appearance"),
    status: t("status"),
    imageAlt: t("selectedImageAlt", { name: "{name}" }),
  };

  return (
    <section className="storybook-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-3 py-4 sm:px-4 md:px-6 md:py-10">
        <header className="rounded-[1.5rem] border border-outline-variant/70 bg-white/90 p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                {t("libraryTitle")}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-on-surface md:text-4xl">
                {t("manageCharacterVisuals")}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base md:leading-7">
                {t("libraryIntro")}
              </p>
            </div>
            <Link
              aria-label={t("returnHome")}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant bg-white text-on-surface shadow-sm md:size-auto md:px-4 md:py-3"
              href="/app"
            >
              <span className="material-symbols-outlined text-xl md:hidden">
                arrow_back
              </span>
              <span className="hidden font-extrabold md:inline">
                {t("returnHome")}
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
                {t("flowTitle")}
              </p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                {t("flowText")}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                {t("characters")}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-on-surface">
                {t("chooseCharacter")}
              </h2>
            </div>
            <span className="w-fit rounded-full bg-surface-container px-3 py-1.5 text-xs font-extrabold text-on-surface-variant">
              {t("characterCount", { count: characters.length })}
            </span>
          </div>

          {characters.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {characters.map((character) => (
                <CharacterCard
                  character={character}
                  copy={copy}
                  householdId={householdId}
                  key={character.id}
                  typeLabel={t(
                    `characterTypes.${characterTypeKey(character.subtype)}`,
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-outline-variant bg-white/75 p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-primary">
                person_add
              </span>
              <h3 className="mt-3 text-xl font-extrabold text-on-surface">
                {t("noCharacterTitle")}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-on-surface-variant">
                {t("noCharacterText")}
              </p>
              <Link className="storybook-button mt-5" href="/app">
                {t("createCharacter")}
              </Link>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
