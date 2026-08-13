import Image from "next/image";

type Props = {
  characterName: string;
  characterTypeLabel: string;
  locationLabel: string;
  selectedImageUrl: string | null;
  imageAlt: string;
  hubTitle: string;
  locationTitle: string;
  storyCount: number;
  storyLabel: string;
  appearanceLabel: string;
  visualIdentityLabel: string;
};

export function CharacterIdentityHeader({
  characterName,
  characterTypeLabel,
  locationLabel,
  selectedImageUrl,
  imageAlt,
  hubTitle,
  locationTitle,
  storyCount,
  storyLabel,
  appearanceLabel,
  visualIdentityLabel,
}: Props) {
  return (
    <header className="overflow-hidden rounded-[1.6rem] border border-outline-variant/70 bg-white/90 shadow-sm md:rounded-[2rem]">
      <div className="grid md:grid-cols-[300px_1fr]">
        <div className="relative min-h-72 overflow-hidden bg-gradient-to-br from-primary-fixed/70 via-surface-container-low to-tertiary-fixed/50 md:min-h-[360px]">
          {selectedImageUrl ? (
            <Image
              alt={imageAlt}
              className="object-contain object-center p-4 md:p-5"
              fill
              sizes="(min-width: 768px) 300px, 100vw"
              src={selectedImageUrl}
              unoptimized
            />
          ) : (
            <div className="grid min-h-72 place-items-center md:min-h-[360px]">
              <div className="grid size-36 place-items-center rounded-full border border-white/70 bg-white/75 shadow-sm">
                <span className="material-symbols-outlined text-7xl text-primary">
                  person
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 md:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            {hubTitle}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-on-surface md:text-4xl">
            {characterName}
          </h1>
          <p className="mt-2 font-bold text-on-surface-variant">
            {characterTypeLabel}
          </p>

          <div className="mt-4 flex items-start gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-lg text-primary">
              location_on
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em]">
                {locationTitle}
              </p>
              <p className="font-semibold">{locationLabel}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-xl">
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="text-2xl font-black text-on-surface">
                {storyCount}
              </p>
              <p className="mt-1 text-xs font-bold text-on-surface-variant">
                {storyLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="text-2xl font-black text-on-surface">—</p>
              <p className="mt-1 text-xs font-bold text-on-surface-variant">
                {appearanceLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-4">
              <span className="material-symbols-outlined text-2xl text-primary">
                photo_library
              </span>
              <p className="mt-1 text-xs font-bold text-on-surface-variant">
                {visualIdentityLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
