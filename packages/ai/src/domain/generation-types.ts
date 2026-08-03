import { z } from "zod";

export const GENERATION_TASKS = [
  "origin_candidate",
  "story_scene",
  "story_dialogue",
  "choice_proposal",
  "reflection_qa",
] as const;
export type GenerationTask = (typeof GENERATION_TASKS)[number];

export const GENERATION_MODES = ["static", "interactive"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const GENERATION_STATUS = [
  "pending",
  "generating",
  "validated",
  "repaired",
  "approved",
  "rejected",
  "failed",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUS)[number];

export const PIPELINE_STAGES = [
  "intent",
  "context",
  "plan",
  "generate",
  "validate",
  "approved",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const FAILURE_STATES = [
  "provider_unavailable",
  "provider_timeout",
  "schema_invalid",
  "safety_blocked",
  "canon_violation",
  "continuity_violation",
  "repair_limit_reached",
  "internal_error",
] as const;
export type FailureState = (typeof FAILURE_STATES)[number];

export const GENERATION_TASK_SCHEMA = z.enum(GENERATION_TASKS);
export const GENERATION_MODE_SCHEMA = z.enum(GENERATION_MODES);
export const GENERATION_STATUS_SCHEMA = z.enum(GENERATION_STATUS);
export const PIPELINE_STAGE_SCHEMA = z.enum(PIPELINE_STAGES);
export const FAILURE_STATE_SCHEMA = z.enum(FAILURE_STATES);

export const generationRequestSchema = z.object({
  requestId: z.string().min(1),
  householdId: z.string().min(1),
  childProfileId: z.string().min(1),
  worldId: z.string().min(1),
  task: GENERATION_TASK_SCHEMA,
  mode: GENERATION_MODE_SCHEMA.default("static"),
  promptKey: z.string().min(1),
  promptVersionId: z.string().optional(),
  contextHash: z.string().min(1),
  modelPolicy: z.object({
    preferredModel: z.string().min(1),
    fallbackModels: z.array(z.string()).default([]),
    maxAttempts: z.number().int().min(1).max(5).default(3),
    maxRepairs: z.number().int().min(0).max(3).default(1),
    timeoutMs: z.number().int().positive().default(30_000),
  }),
  variables: z.record(z.string(), z.unknown()).default({}),
  seed: z.string().optional(),
});

export interface GenerationRequest {
  requestId: string;
  householdId: string;
  childProfileId: string;
  worldId: string;
  task: GenerationTask;
  mode: GenerationMode;
  promptKey: string;
  promptVersionId?: string | undefined;
  contextHash: string;
  modelPolicy: ModelPolicy;
  variables: Record<string, unknown>;
  seed?: string | undefined;
}

export interface ModelPolicy {
  preferredModel: string;
  fallbackModels: string[];
  maxAttempts: number;
  maxRepairs: number;
  timeoutMs: number;
}

export const providerUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative().default(0),
  completionTokens: z.number().int().nonnegative().default(0),
  totalTokens: z.number().int().nonnegative().default(0),
  latencyMs: z.number().int().nonnegative().default(0),
  costUsd: z.number().nonnegative().default(0),
});

export interface ProviderUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd: number;
}

export const generationAttemptSchema = z.object({
  attemptNumber: z.number().int().positive(),
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  status: z.enum(["success", "failure"]),
  failureState: FAILURE_STATE_SCHEMA.optional(),
  usage: providerUsageSchema,
  repaired: z.boolean().default(false),
});

export interface GenerationAttempt {
  attemptNumber: number;
  providerId: string;
  modelId: string;
  status: "success" | "failure";
  failureState?: FailureState | undefined;
  usage: ProviderUsage;
  repaired: boolean;
}

export interface GenerationResponse<T = unknown> {
  requestId: string;
  task: GenerationTask;
  status: GenerationStatus;
  output: T | null;
  modelId: string | null;
  providerId: string | null;
  attempts: GenerationAttempt[];
  failureState?: FailureState | undefined;
  outputHash: string;
}
