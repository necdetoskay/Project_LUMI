import "server-only";
import { OpenRouterTextGenerationProvider } from "./openrouter-provider";
import type {
  TextGenerationProvider,
  TextGenerationRequest,
  TextGenerationResult,
} from "./types";

const providers: Record<string, TextGenerationProvider> = {
  openrouter: new OpenRouterTextGenerationProvider(),
};

export async function generateText(
  request: TextGenerationRequest,
): Promise<TextGenerationResult> {
  const providerId =
    request.provider || process.env.LUMI_TEXT_PROVIDER || "openrouter";
  const provider = providers[providerId];
  if (!provider)
    throw new Error(`Unsupported text generation provider: ${providerId}`);
  return provider.generate(request);
}
