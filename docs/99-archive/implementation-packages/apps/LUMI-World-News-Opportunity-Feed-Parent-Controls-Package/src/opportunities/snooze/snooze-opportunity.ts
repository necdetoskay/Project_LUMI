export function calculateSnoozeUntil(input: {
  now: Date;
  duration:
    | "later_today"
    | "tomorrow"
    | "three_days";
}): Date {
  const hours =
    input.duration === "later_today"
      ? 6
      : input.duration === "tomorrow"
        ? 24
        : 72;

  return new Date(
    input.now.getTime() +
      hours * 60 * 60 * 1000,
  );
}
