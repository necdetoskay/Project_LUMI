import { db } from "../../client";
import { biomes } from "../../schema/world";

const biomeSeed = [
  {
    code: "forest",
    name: "Orman",
    metadata: {
      climate: "temperate",
      terrain: ["woods", "trail"],
    },
  },
  {
    code: "mountain",
    name: "Dağ",
    metadata: {
      climate: "cold",
      terrain: ["rock", "cliff"],
    },
  },
  {
    code: "coast",
    name: "Sahil",
    metadata: {
      climate: "mild",
      terrain: ["beach", "cliff"],
    },
  },
  {
    code: "village",
    name: "Yerleşim",
    metadata: {
      climate: "variable",
      terrain: ["road", "houses"],
    },
  },
  {
    code: "cave",
    name: "Mağara",
    metadata: {
      climate: "underground",
      terrain: ["tunnel", "chamber"],
    },
  },
] as const;

export async function seedBiomes(): Promise<void> {
  await db
    .insert(biomes)
    .values(biomeSeed)
    .onConflictDoUpdate({
      target: biomes.code,
      set: {
        name: biomes.name,
        metadata: biomes.metadata,
      },
    });
}
