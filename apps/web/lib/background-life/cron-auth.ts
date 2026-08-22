import { timingSafeEqual } from "node:crypto";

export function isBackgroundLifeCronAuthorized(
  authorizationHeader: string | null,
  configuredSecret: string | undefined,
): boolean {
  const secret = configuredSecret?.trim();
  if (!secret || !authorizationHeader?.startsWith("Bearer ")) return false;

  const candidate = authorizationHeader.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const candidateBuffer = Buffer.from(candidate);
  if (expectedBuffer.length !== candidateBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, candidateBuffer);
}
