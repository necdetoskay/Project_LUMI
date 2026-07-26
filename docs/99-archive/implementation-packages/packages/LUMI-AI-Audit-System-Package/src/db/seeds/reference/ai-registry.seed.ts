import { eq } from "drizzle-orm";
import { db } from "../../client";
import { aiModels, aiProviders } from "../../schema/ai";

export async function seedAiRegistry(): Promise<void> {
  const providers = [
    { code: "openrouter", name: "OpenRouter" },
    { code: "openai", name: "OpenAI" },
    { code: "google", name: "Google" },
    { code: "black_forest_labs", name: "Black Forest Labs" },
  ];

  for (const provider of providers) {
    await db.insert(aiProviders).values(provider)
      .onConflictDoUpdate({
        target: aiProviders.code,
        set: { name: provider.name, isActive: true },
      });
  }

  const [openRouter] = await db.select().from(aiProviders)
    .where(eq(aiProviders.code, "openrouter")).limit(1);

  if (openRouter) {
    await db.insert(aiModels).values([
      {
        providerId: openRouter.id,
        code: "configurable-text-model",
        displayName: "Configurable Text Model",
        capabilityType: "text",
      },
      {
        providerId: openRouter.id,
        code: "configurable-image-model",
        displayName: "Configurable Image Model",
        capabilityType: "image",
      },
    ]).onConflictDoNothing({
      target: [aiModels.providerId, aiModels.code],
    });
  }
}
