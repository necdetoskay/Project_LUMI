export type DateRangePreset =
  | "7d"
  | "30d"
  | "90d"
  | "custom";

export function resolveDateRange(input: {
  preset: DateRangePreset;
  now?: Date;
  customFrom?: Date;
  customTo?: Date;
}) {
  const now = input.now ?? new Date();

  if (
    input.preset === "custom" &&
    input.customFrom &&
    input.customTo
  ) {
    return {
      from: input.customFrom,
      to: input.customTo,
    };
  }

  const days =
    input.preset === "7d"
      ? 7
      : input.preset === "30d"
        ? 30
        : 90;

  return {
    from: new Date(
      now.getTime() -
        days * 24 * 60 * 60 * 1000,
    ),
    to: now,
  };
}
