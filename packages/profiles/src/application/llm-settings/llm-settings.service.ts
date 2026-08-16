import { getProfileDb } from "../db";
import {
  DrizzleHouseholdRepository,
  DrizzleLlmProviderSettingsRepository,
  DrizzleLlmTaskModelSettingsRepository,
} from "../../db/repositories/drizzle";
import { encryptApiKey, decryptApiKey, maskApiKey } from "./encryption";
import { callOpenRouter } from "./openrouter-client";
import {
  LLM_TASK_TYPES,
  type LlmTaskType,
} from "../../db/schema/profile/llm-task-model-settings";
import { AuthorizationError, ValidationError } from "../../domain";

const DEFAULT_OPENROUTER_MODEL_ID = "aion-labs/aion-3.0-mini";
const DEFAULT_CANONICAL_TASK_TYPES: readonly LlmTaskType[] = [
  "character_identity_suggestions",
  "character_world_suggestions",
  "character_world_compatibility",
  "character_region_suggestions",
  "character_origin_suggestions",
  "character_core_saga",
];

export interface LlmSettingsResponse {
  hasApiKey: boolean;
  maskedApiKey: string | null;
  enabled: boolean;
  provider: string;
  taskSettings: TaskModelSettingResponse[];
}

export interface TaskModelSettingResponse {
  id: string;
  taskType: string;
  modelId: string;
  reasoningLevel: string;
  temperature: number;
  maxOutputTokens: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertTaskModelSettingInput {
  householdId: string;
  taskType: string;
  modelId: string;
  reasoningLevel: string;
  temperature: number;
  maxOutputTokens: number;
  enabled: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  model: string | null;
  error: string | null;
}

function getRepos(db: ReturnType<typeof getProfileDb> = getProfileDb()) {
  return {
    householdRepo: new DrizzleHouseholdRepository(db),
    providerRepo: new DrizzleLlmProviderSettingsRepository(db),
    taskRepo: new DrizzleLlmTaskModelSettingsRepository(db),
  };
}

async function assertHouseholdAccess(
  userId: string,
  householdId: string,
  repos: ReturnType<typeof getRepos>,
): Promise<void> {
  const household = await repos.householdRepo.findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }
}

function validateTaskType(taskType: string): LlmTaskType {
  if (!(LLM_TASK_TYPES as readonly string[]).includes(taskType)) {
    throw new ValidationError(
      "INVALID_TASK_TYPE",
      `Task type must be one of: ${LLM_TASK_TYPES.join(", ")}`,
      "taskType",
    );
  }
  return taskType as LlmTaskType;
}

function validateReasoningLevel(level: string): string {
  if (!["low", "medium", "high"].includes(level)) {
    throw new ValidationError(
      "INVALID_REASONING_LEVEL",
      "Reasoning level must be 'low', 'medium', or 'high'",
      "reasoningLevel",
    );
  }
  return level;
}

function validateModelId(modelId: string): string {
  const trimmed = modelId.trim();
  if (trimmed.length < 1 || trimmed.length > 160) {
    throw new ValidationError(
      "INVALID_MODEL_ID",
      "Model ID must be between 1 and 160 characters",
      "modelId",
    );
  }
  return trimmed;
}

function validateTemperature(temp: number): number {
  if (typeof temp !== "number" || temp < 0 || temp > 2) {
    throw new ValidationError(
      "INVALID_TEMPERATURE",
      "Temperature must be between 0 and 2",
      "temperature",
    );
  }
  return temp;
}

function validateMaxOutputTokens(tokens: number): number {
  if (!Number.isInteger(tokens) || tokens < 256 || tokens > 8000) {
    throw new ValidationError(
      "INVALID_MAX_OUTPUT_TOKENS",
      "Max output tokens must be between 256 and 8000",
      "maxOutputTokens",
    );
  }
  return tokens;
}

export async function getLlmSettings(
  userId: string,
  householdId: string,
): Promise<LlmSettingsResponse> {
  const repos = getRepos();
  await assertHouseholdAccess(userId, householdId, repos);

  const providerSettings = await repos.providerRepo.findByUserAndHousehold(
    userId,
    householdId,
    "openrouter",
  );

  const taskRecords = await repos.taskRepo.findByUserAndHousehold(
    userId,
    householdId,
  );

  let maskedApiKey: string | null = null;
  if (providerSettings?.encryptedApiKey) {
    try {
      const decrypted = decryptApiKey(providerSettings.encryptedApiKey);
      maskedApiKey = maskApiKey(decrypted);
    } catch {
      maskedApiKey = null;
    }
  }

  return {
    hasApiKey: !!providerSettings?.encryptedApiKey,
    maskedApiKey,
    enabled: providerSettings?.enabled ?? false,
    provider: providerSettings?.provider ?? "openrouter",
    taskSettings: taskRecords.map((r) => ({
      id: r.id,
      taskType: r.taskType,
      modelId: r.modelId,
      reasoningLevel: r.reasoningLevel,
      temperature: r.temperature,
      maxOutputTokens: r.maxOutputTokens,
      enabled: r.enabled,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

export async function upsertOpenRouterKey(
  userId: string,
  householdId: string,
  apiKey: string,
): Promise<LlmSettingsResponse> {
  const repos = getRepos();
  await assertHouseholdAccess(userId, householdId, repos);

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new ValidationError(
      "MISSING_API_KEY",
      "API key is required",
      "apiKey",
    );
  }

  let encrypted: string;
  try {
    encrypted = encryptApiKey(apiKey.trim());
  } catch (err) {
    throw new ValidationError(
      "ENCRYPTION_CONFIG_ERROR",
      (err as Error).message ?? "Encryption key is not configured",
      "apiKey",
    );
  }

  const rawDb = getProfileDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = {
      householdRepo: new DrizzleHouseholdRepository(tx as never),
      providerRepo: new DrizzleLlmProviderSettingsRepository(tx as never),
      taskRepo: new DrizzleLlmTaskModelSettingsRepository(tx as never),
    };
    await txRepos.providerRepo.upsert({
      id: crypto.randomUUID(),
      userId,
      householdId,
      provider: "openrouter",
      encryptedApiKey: encrypted,
      enabled: true,
    });

    const existingTask = await txRepos.taskRepo.findByTaskType(
      userId,
      householdId,
      "character_origin_generation",
    );
    if (!existingTask) {
      await txRepos.taskRepo.upsert({
        id: crypto.randomUUID(),
        userId,
        householdId,
        provider: "openrouter",
        taskType: "character_origin_generation",
        modelId: "aion-labs/aion-3.0-mini",
        reasoningLevel: "medium",
        temperature: 0.85,
        maxOutputTokens: 1800,
        enabled: true,
      });
    }
  });

  return getLlmSettings(userId, householdId);
}

export async function deleteOpenRouterKey(
  userId: string,
  householdId: string,
): Promise<LlmSettingsResponse> {
  const repos = getRepos();
  await assertHouseholdAccess(userId, householdId, repos);

  try {
    await repos.providerRepo.deleteApiKey(userId, householdId, "openrouter");
  } catch (err) {
    throw new ValidationError(
      "NO_API_KEY_TO_DELETE",
      (err as Error).message ?? "No API key found to delete",
      "apiKey",
    );
  }

  return getLlmSettings(userId, householdId);
}

export async function upsertTaskModelSetting(
  userId: string,
  input: UpsertTaskModelSettingInput,
): Promise<TaskModelSettingResponse> {
  const repos = getRepos();
  await assertHouseholdAccess(userId, input.householdId, repos);

  const taskType = validateTaskType(input.taskType);
  const modelId = validateModelId(input.modelId);
  const reasoningLevel = validateReasoningLevel(input.reasoningLevel);
  const temperature = validateTemperature(input.temperature);
  const maxOutputTokens = validateMaxOutputTokens(input.maxOutputTokens);

  const record = await repos.taskRepo.upsert({
    id: crypto.randomUUID(),
    userId,
    householdId: input.householdId,
    provider: "openrouter",
    taskType,
    modelId,
    reasoningLevel,
    temperature,
    maxOutputTokens,
    enabled: input.enabled,
  });

  return {
    id: record.id,
    taskType: record.taskType,
    modelId: record.modelId,
    reasoningLevel: record.reasoningLevel,
    temperature: record.temperature,
    maxOutputTokens: record.maxOutputTokens,
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listTaskModelSettings(
  userId: string,
  householdId: string,
): Promise<TaskModelSettingResponse[]> {
  const repos = getRepos();
  await assertHouseholdAccess(userId, householdId, repos);

  const records = await repos.taskRepo.findByUserAndHousehold(
    userId,
    householdId,
  );
  return records.map((r) => ({
    id: r.id,
    taskType: r.taskType,
    modelId: r.modelId,
    reasoningLevel: r.reasoningLevel,
    temperature: r.temperature,
    maxOutputTokens: r.maxOutputTokens,
    enabled: r.enabled,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getTaskModelSetting(
  userId: string,
  householdId: string,
  taskType: string,
): Promise<TaskModelSettingResponse | null> {
  const repos = getRepos();
  await assertHouseholdAccess(userId, householdId, repos);

  const record = await repos.taskRepo.findByTaskType(
    userId,
    householdId,
    taskType,
  );
  if (!record) return null;

  return {
    id: record.id,
    taskType: record.taskType,
    modelId: record.modelId,
    reasoningLevel: record.reasoningLevel,
    temperature: record.temperature,
    maxOutputTokens: record.maxOutputTokens,
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function testOpenRouterConnection(
  userId: string,
  householdId: string,
): Promise<TestConnectionResult> {
  const repos = getRepos();
  await assertHouseholdAccess(userId, householdId, repos);

  const providerSettings = await repos.providerRepo.findByUserAndHousehold(
    userId,
    householdId,
    "openrouter",
  );

  if (!providerSettings?.encryptedApiKey) {
    return { success: false, model: null, error: "No API key configured" };
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(providerSettings.encryptedApiKey);
  } catch {
    return { success: false, model: null, error: "Failed to decrypt API key" };
  }

  try {
    const taskSetting = await repos.taskRepo.findByTaskType(
      userId,
      householdId,
      "character_origin_generation",
    );
    const model = taskSetting?.modelId ?? "aion-labs/aion-3.0-mini";

    const result = await callOpenRouter(apiKey, {
      model,
      messages: [
        { role: "system", content: "Reply with a single word: ok" },
        { role: "user", content: "test" },
      ],
      maxTokens: 10,
    });
    return { success: true, model: result.model, error: null };
  } catch (err) {
    return {
      success: false,
      model: null,
      error: (err as Error).message ?? "Connection test failed",
    };
  }
}

export async function ensureDefaultLlmTaskSettings(
  userId: string,
  householdId: string,
): Promise<void> {
  const repos = getRepos();
  await assertHouseholdAccess(userId, householdId, repos);

  for (const taskType of DEFAULT_CANONICAL_TASK_TYPES) {
    const existing = await repos.taskRepo.findByTaskType(
      userId,
      householdId,
      taskType,
    );
    if (existing) continue;

    await repos.taskRepo.upsert({
      id: crypto.randomUUID(),
      userId,
      householdId,
      provider: "openrouter",
      taskType,
      modelId: DEFAULT_OPENROUTER_MODEL_ID,
      reasoningLevel: "medium",
      temperature: 0.8,
      maxOutputTokens: 1800,
      enabled: true,
    });
  }
}

export async function getOpenRouterApiKey(
  userId: string,
  householdId: string,
): Promise<string | null> {
  const repos = getRepos();
  const providerSettings = await repos.providerRepo.findByUserAndHousehold(
    userId,
    householdId,
    "openrouter",
  );
  if (providerSettings?.encryptedApiKey) {
    try {
      const scopedApiKey = decryptApiKey(providerSettings.encryptedApiKey);
      if (scopedApiKey.trim()) return scopedApiKey;
    } catch {
      // Fall through to the server-wide credential when a scoped key is unusable.
    }
  }

  const envApiKey = process.env.OPENROUTER_API_KEY?.trim();
  return envApiKey || null;
}
