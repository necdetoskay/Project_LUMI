import { describe, expect, it } from "vitest";
import {
  createChildRequestSchema,
  createHouseholdRequestSchema,
  createWorldRequestSchema,
} from "../contracts/onboarding";

describe("API contracts", () => {
  it("accepts valid household payload", () => {
    const result = createHouseholdRequestSchema.parse({
      name: "Oskay Ailesi",
      slug: "oskay-ailesi",
    });

    expect(result.slug).toBe("oskay-ailesi");
  });

  it("rejects invalid slug", () => {
    expect(() =>
      createHouseholdRequestSchema.parse({
        name: "Oskay Ailesi",
        slug: "Oskay Ailesi",
      }),
    ).toThrow();
  });

  it("accepts valid child payload", () => {
    const result = createChildRequestSchema.parse({
      name: "Lina",
      birthYear: 2021,
    });

    expect(result.name).toBe("Lina");
  });

  it("accepts complete world foundation payload", () => {
    expect(() =>
      createWorldRequestSchema.parse({
        universeName: "LUMI Evreni",
        universeSlug: "lumi-evreni",
        worldName: "Işık Adası",
        worldSlug: "isik-adasi",
        regionName: "Yeşil Vadi",
        regionSlug: "yesil-vadi",
        locationName: "Başlangıç Evi",
        locationSlug: "baslangic-evi",
      }),
    ).not.toThrow();
  });
});
