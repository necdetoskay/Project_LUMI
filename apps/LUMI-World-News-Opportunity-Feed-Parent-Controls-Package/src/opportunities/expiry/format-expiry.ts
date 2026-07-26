export function getExpiryLabel(
  expiresAt: Date | undefined,
  now = new Date(),
): string | undefined {
  if (!expiresAt) return undefined;

  const remainingMs =
    expiresAt.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return "Süresi doldu";
  }

  const remainingHours = Math.ceil(
    remainingMs / (60 * 60 * 1000),
  );

  if (remainingHours < 24) {
    return `${remainingHours} saat kaldı`;
  }

  const remainingDays = Math.ceil(
    remainingHours / 24,
  );

  return `${remainingDays} gün kaldı`;
}
