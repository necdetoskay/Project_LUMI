import { describe, expect, it } from "vitest";

import {
  parseAndValidatePromptOutput,
  PromptOutputValidationError,
} from "./prompt-output-validator";

const schema = {
  type: "object",
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        required: ["key", "name"],
        properties: {
          key: { type: "string" },
          name: { type: "string", minLength: 2 },
        },
      },
    },
  },
};

describe("parseAndValidatePromptOutput", () => {
  it("wraps a direct array only when the schema is a suggestions envelope", () => {
    expect(
      parseAndValidatePromptOutput(
        JSON.stringify([
          { key: "a", name: "Ada" },
          { key: "b", name: "Luna" },
        ]),
        schema,
      ),
    ).toEqual({
      suggestions: [
        { key: "a", name: "Ada" },
        { key: "b", name: "Luna" },
      ],
    });
  });

  it("still rejects malformed candidate items after normalization", () => {
    expect(() =>
      parseAndValidatePromptOutput(
        JSON.stringify([{ key: "a" }, { key: "b", name: "L" }]),
        schema,
      ),
    ).toThrow(PromptOutputValidationError);
  });

  it("does not wrap direct arrays for unrelated object schemas", () => {
    expect(() =>
      parseAndValidatePromptOutput(JSON.stringify(["x"]), {
        type: "object",
        required: ["value"],
        properties: { value: { type: "string" } },
      }),
    ).toThrow(PromptOutputValidationError);
  });
});
