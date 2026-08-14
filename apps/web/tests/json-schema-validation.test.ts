import { describe, expect, it } from "vitest";
import { validateJsonSchema } from "@/lib/prompts/json-schema-validation";

const schema = {
  type: "object",
  required: ["name", "items"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "integer" } },
      },
    },
  },
};

describe("validateJsonSchema", () => {
  it("accepts matching nested output", () => {
    expect(
      validateJsonSchema({ name: "Forest", items: [{ id: 1 }] }, schema).valid,
    ).toBe(true);
  });
  it("reports required, type and additional property errors", () => {
    const result = validateJsonSchema(
      { items: [{ id: "wrong" }], extra: true },
      schema,
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("$.name: required property is missing");
    expect(result.errors).toContain("$.items[0].id: expected integer");
    expect(result.errors).toContain(
      "$.extra: additional property is not allowed",
    );
  });
});
