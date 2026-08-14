import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";
import { getActiveCharacterCreationCycle } from "./character-creation-cycle.service";
import { getProfileDb } from "./db";
import { aiGenerationTraces } from "../db/schema/profile";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";

export interface WorldCharacterSuggestion { key:string; name:string; description:string; fitReason:string }
export interface WorldCharacterSuggestionResult { suggestions:WorldCharacterSuggestion[] }

export async function generateWorldCharacterSuggestions(userId:string,input:{householdId:string;childProfileId:string}):Promise<WorldCharacterSuggestionResult>{
  const cycle=await getActiveCharacterCreationCycle(userId,input.householdId,input.childProfileId);
  if(!cycle||cycle.startDirection!=="world_first")throw new Error("WORLD_FIRST_CYCLE_REQUIRED");
  const summary=(cycle.latestSummary??{}) as Record<string,unknown>;
  const worldFeeling=summary.worldFeeling;
  if(typeof worldFeeling!=="string")throw new Error("WORLD_FEELING_REQUIRED");
  const context={worldFeeling,previousSelections:summary};
  const prompt=await resolveActivePrompt("character_onboarding.world_character_suggestions",context);
  const generated=await generateTextWithLlm({userId,householdId:input.householdId,taskType:"world_character_suggestions",system:prompt.system,user:prompt.user,modelOverride:prompt.modelOverride,generationConfig:prompt.generationConfig});
  const costFields=generated.cost?{estimatedCostUsdMicros:generated.cost.estimatedCostUsdMicros,costSource:generated.cost.costSource,pricingSnapshot:generated.cost.pricingSnapshot}:{};
  let suggestions:WorldCharacterSuggestion[];
  try{
    const value=parseAndValidatePromptOutput(generated.content,prompt.outputSchema) as {suggestions:WorldCharacterSuggestion[]};
    suggestions=value.suggestions;
  }catch(error){
    await getProfileDb().insert(aiGenerationTraces).values({id:crypto.randomUUID(),householdId:input.householdId,childProfileId:input.childProfileId,creationCycleId:cycle.id,taskType:"world_character_suggestions",promptKey:prompt.promptKey,promptVersion:prompt.promptVersion,provider:generated.provider,modelId:generated.model,inputContext:context,outputPayload:{raw:generated.content},validationStatus:"invalid",promptTokens:generated.promptTokens,completionTokens:generated.completionTokens,totalTokens:generated.totalTokens,...costFields,latencyMs:generated.latencyMs});
    throw error;
  }
  await getProfileDb().insert(aiGenerationTraces).values({id:crypto.randomUUID(),householdId:input.householdId,childProfileId:input.childProfileId,creationCycleId:cycle.id,taskType:"world_character_suggestions",promptKey:prompt.promptKey,promptVersion:prompt.promptVersion,provider:generated.provider,modelId:generated.model,inputContext:context,outputPayload:{suggestions},validationStatus:"valid",promptTokens:generated.promptTokens,completionTokens:generated.completionTokens,totalTokens:generated.totalTokens,...costFields,latencyMs:generated.latencyMs});
  return {suggestions};
}
