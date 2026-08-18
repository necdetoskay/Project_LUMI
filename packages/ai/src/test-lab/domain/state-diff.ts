import type { JsonObject, JsonValue, StateDiff } from "./test-lab-types";

function stableJson(value: JsonValue | undefined): string {
  return JSON.stringify(value) ?? "undefined";
}

export function createStateDiff(input: {
  fromStateId: string;
  toStateId: string;
  before: JsonObject;
  after: JsonObject;
}): StateDiff {
  const beforeKeys = new Set(Object.keys(input.before));
  const afterKeys = new Set(Object.keys(input.after));

  const addedKeys = [...afterKeys]
    .filter((key) => !beforeKeys.has(key))
    .sort();
  const removedKeys = [...beforeKeys]
    .filter((key) => !afterKeys.has(key))
    .sort();
  const changedKeys = [...beforeKeys]
    .filter(
      (key) =>
        afterKeys.has(key) &&
        stableJson(input.before[key]) !== stableJson(input.after[key]),
    )
    .sort();

  return {
    fromStateId: input.fromStateId,
    toStateId: input.toStateId,
    addedKeys,
    removedKeys,
    changedKeys,
  };
}
