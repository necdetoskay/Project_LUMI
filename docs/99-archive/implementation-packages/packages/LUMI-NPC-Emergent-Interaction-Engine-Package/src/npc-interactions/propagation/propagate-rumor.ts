export type RumorPropagationInput = {
  rumorId: string;
  sourceCharacterId: string;
  receiverCharacterId: string;
  sourceReliability: number;
  relationshipTrust: number;
  distortionRisk: number;
};

export function propagateRumor(
  input: RumorPropagationInput,
): {
  rumorId: string;
  receiverCharacterId: string;
  receivedReliability: number;
  distorted: boolean;
} {
  const receivedReliability = Math.max(
    0,
    Math.min(
      1,
      input.sourceReliability * 0.6 +
        input.relationshipTrust * 0.4 -
        input.distortionRisk * 0.25,
    ),
  );

  return {
    rumorId: input.rumorId,
    receiverCharacterId: input.receiverCharacterId,
    receivedReliability,
    distorted:
      input.distortionRisk > 0.55 &&
      receivedReliability < 0.6,
  };
}
