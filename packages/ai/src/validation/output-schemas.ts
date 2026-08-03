import { z } from "zod";

import { originBatchProposalSchema } from "../domain/origin-types";

export const storySceneSchema = z.object({
  sceneId: z.string().min(1),
  setting: z.string().min(1).max(500),
  characters: z.array(z.string()).min(1).max(6).default([]),
  narrative: z.string().min(1).max(4000),
  moment: z.string().min(1).max(2000),
  nextPrompt: z.string().min(1).max(2000),
  continuityNote: z.string().max(500).optional(),
});

export const storyDialogueSchema = z.object({
  lineId: z.string().min(1),
  speaker: z.string().min(1).max(120),
  text: z.string().min(1).max(1000),
  tone: z.string().min(1).max(80),
});

export const choiceProposalSchema = z.object({
  choiceId: z.string().min(1),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(240),
        lead: z.string().min(1).max(240),
        risk: z.enum(["low", "medium", "high"]),
      }),
    )
    .min(2)
    .max(4),
});

export const reflectionQaSchema = z.object({
  questionId: z.string().min(1),
  question: z.string().min(1).max(500),
  hint: z.string().min(1).max(500),
});

export const generationOutputSchemas = {
  origin_candidate: originBatchProposalSchema,
  story_scene: storySceneSchema,
  story_dialogue: storyDialogueSchema,
  choice_proposal: choiceProposalSchema,
  reflection_qa: reflectionQaSchema,
} as const;

export type GenerationOutputSchemaKey = keyof typeof generationOutputSchemas;
