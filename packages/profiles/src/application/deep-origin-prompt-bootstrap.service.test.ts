import { describe, expect, it } from "vitest";

import {
  DEEP_CHARACTER_ORIGIN_OUTPUT_SCHEMA,
  DEEP_CHARACTER_ORIGIN_PROMPT_KEY,
} from "./deep-origin-prompt-bootstrap.service";

describe("Deep Origin prompt contract", () => {
  it("uses a dedicated Character Genesis prompt key", () => {
    expect(DEEP_CHARACTER_ORIGIN_PROMPT_KEY).toBe(
      "character_genesis.deep_origin",
    );
  });

  it("requires fact lineage, unresolved questions and future hooks", () => {
    const suggestions = (
      DEEP_CHARACTER_ORIGIN_OUTPUT_SCHEMA.properties as Record<
        string,
        Record<string, unknown>
      >
    ).suggestions!;
    const item = suggestions.items as Record<string, unknown>;
    const required = item.required as string[];

    expect(required).toEqual(
      expect.arrayContaining([
        "summary",
        "narrative",
        "facts",
        "summaryFactIds",
        "narrativeFactIds",
        "unresolvedQuestions",
        "storyHooks",
      ]),
    );
  });
});
