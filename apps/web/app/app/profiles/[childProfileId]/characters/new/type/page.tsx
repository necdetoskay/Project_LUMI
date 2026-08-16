import { redirect } from "next/navigation";

export default async function CharacterTypeStepPage({
  params,
}: {
  params: Promise<{ childProfileId: string }>;
}) {
  const { childProfileId } = await params;
  redirect(
    `/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/wizard`,
  );
}
