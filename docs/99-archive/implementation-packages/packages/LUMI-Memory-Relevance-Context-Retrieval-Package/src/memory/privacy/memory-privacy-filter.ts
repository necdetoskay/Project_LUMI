import type { MemoryCandidate } from "../types";

const blockedMetadataKeys = new Set([
  "email",
  "phone",
  "address",
  "accessToken",
  "refreshToken",
  "password",
]);

export function sanitizeMemoryCandidate(
  candidate: MemoryCandidate,
): MemoryCandidate {
  const metadata = Object.fromEntries(
    Object.entries(candidate.metadata ?? {}).filter(
      ([key]) => !blockedMetadataKeys.has(key),
    ),
  );

  return {
    ...candidate,
    summary: candidate.summary.trim(),
    metadata,
  };
}

export function canRequesterAccessMemory(input: {
  privacyLevel: "public" | "household" | "private";
  requesterIsHouseholdMember: boolean;
  requesterOwnsSubject: boolean;
}): boolean {
  if (input.privacyLevel === "public") return true;

  if (
    input.privacyLevel === "household" &&
    input.requesterIsHouseholdMember
  ) {
    return true;
  }

  return (
    input.privacyLevel === "private" &&
    input.requesterOwnsSubject
  );
}
