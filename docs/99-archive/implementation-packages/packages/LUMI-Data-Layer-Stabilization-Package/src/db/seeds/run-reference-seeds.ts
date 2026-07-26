import { seedIdentityReferenceData } from "./reference/identity.seed";
import { seedBiomes } from "./reference/biomes.seed";
import { seedTraits } from "./reference/traits.seed";
import { seedEmotions } from "./reference/emotions.seed";
import { seedRelationshipDimensions } from "./reference/relationship-dimensions.seed";
import { seedItems } from "./reference/items.seed";
import { seedAiRegistry } from "./reference/ai-registry.seed";
import { seedFeatureFlags } from "./reference/feature-flags.seed";

export async function runReferenceSeeds(): Promise<void> {
  await seedIdentityReferenceData();
  await seedBiomes();
  await seedTraits();
  await seedEmotions();
  await seedRelationshipDimensions();
  await seedItems();
  await seedAiRegistry();
  await seedFeatureFlags();
}
