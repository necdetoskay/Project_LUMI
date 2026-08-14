import CharacterTypeStepClient from "./character-type-step-client";

export default async function CharacterTypeStepPage({
  params,
}: {
  params: Promise<{ childProfileId: string }>;
}) {
  const { childProfileId } = await params;

  return <CharacterTypeStepClient childProfileId={childProfileId} />;
}
