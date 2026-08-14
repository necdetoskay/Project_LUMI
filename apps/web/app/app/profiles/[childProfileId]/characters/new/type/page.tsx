import CharacterTypeStepClient from "./character-type-step-client";

const FALLBACK_VISUALS = {
  human: "/onboarding/character-types/human.svg",
  animal: "/onboarding/character-types/animal.svg",
  fantastic: "/onboarding/character-types/fantastic.svg",
  synthetic: "/onboarding/character-types/synthetic.svg",
} as const;

function characterTypeVisuals() {
  const publicBaseUrl = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(
    /\/$/,
    "",
  );

  if (!publicBaseUrl) return FALLBACK_VISUALS;

  return {
    human: `${publicBaseUrl}/onboarding/character-types/human.webp`,
    animal: `${publicBaseUrl}/onboarding/character-types/animal.webp`,
    fantastic: `${publicBaseUrl}/onboarding/character-types/fantastic.webp`,
    synthetic: `${publicBaseUrl}/onboarding/character-types/synthetic.webp`,
  } as const;
}

export default async function CharacterTypeStepPage({
  params,
}: {
  params: Promise<{ childProfileId: string }>;
}) {
  const { childProfileId } = await params;

  return (
    <CharacterTypeStepClient
      childProfileId={childProfileId}
      characterTypeVisuals={characterTypeVisuals()}
      fallbackCharacterTypeVisuals={FALLBACK_VISUALS}
    />
  );
}
