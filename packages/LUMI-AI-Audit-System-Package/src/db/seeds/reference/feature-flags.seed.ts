import { db } from "../../client";
import { featureFlags } from "../../schema/system";

const flags = [
  {
    code: "story_generation",
    name: "Story Generation",
    isEnabled: true,
  },
  {
    code: "image_generation",
    name: "Image Generation",
    isEnabled: false,
  },
  {
    code: "background_simulation",
    name: "Background Simulation",
    isEnabled: false,
  },
  {
    code: "memory_embeddings",
    name: "Memory Embeddings",
    isEnabled: false,
  },
];

export async function seedFeatureFlags(): Promise<void> {
  await db.insert(featureFlags).values(flags)
    .onConflictDoNothing({ target: featureFlags.code });
}
