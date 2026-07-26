import { z } from "zod";
import { successEnvelope } from "./common";

export const createStoryRequestSchema = z.object({
  worldId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  storyType: z.enum(["static", "interactive"]),
  titlePrompt: z.string().trim().max(240).optional(),
  themePrompt: z.string().trim().max(1000).optional(),
  participantCharacterIds: z
    .array(z.string().uuid())
    .min(1)
    .max(6),
  selectedItemInstanceId: z.string().uuid().optional(),
  includeImages: z.boolean().default(true),
  imageCount: z.number().int().min(0).max(12).default(4),
  includeTts: z.boolean().default(false),
});

export const createStoryResponseSchema = successEnvelope(
  z.object({
    generationRequestId: z.string().uuid(),
    estimatedCostTry: z.number().nonnegative(),
  }),
);

export const startStorySessionRequestSchema = z.object({
  storyVersionId: z.string().uuid(),
  participantCharacterIds: z.array(z.string().uuid()).min(1),
  selectedItemInstanceId: z.string().uuid().optional(),
});

export const recordDecisionRequestSchema = z.object({
  nodeId: z.string().uuid(),
  choiceId: z.string().uuid(),
  decisionSequence: z.number().int().positive(),
});

export const answerQuestionRequestSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().trim().min(1).max(2000),
});

export const createReflectionRequestSchema = z.object({
  reflectionText: z.string().trim().min(1).max(3000),
  mood: z.string().trim().max(80).optional(),
});
