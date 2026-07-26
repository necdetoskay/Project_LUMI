export type CooldownPolicy = {
  interactionType: string;
  sourceCooldownHours: number;
  targetCooldownHours: number;
  pairCooldownHours: number;
};

export function isCooldownActive(input: {
  now: Date;
  lastSourceInteractionAt?: Date;
  lastTargetInteractionAt?: Date;
  lastPairInteractionAt?: Date;
  policy: CooldownPolicy;
}): boolean {
  const hourMs = 60 * 60 * 1000;

  const within = (
    date: Date | undefined,
    hours: number,
  ) =>
    Boolean(
      date &&
        input.now.getTime() - date.getTime() <
          hours * hourMs,
    );

  return (
    within(
      input.lastSourceInteractionAt,
      input.policy.sourceCooldownHours,
    ) ||
    within(
      input.lastTargetInteractionAt,
      input.policy.targetCooldownHours,
    ) ||
    within(
      input.lastPairInteractionAt,
      input.policy.pairCooldownHours,
    )
  );
}
