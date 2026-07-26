import { z } from "zod";

export const generatedChoiceSchema = z.object({
  key: z.string().min(1).max(120),
  label: z.string().min(1).max(300),
  hint: z.string().max(500).optional(),
  consequencePreview: z
    .string()
    .max(500)
    .optional(),
  nextNodeKey: z.string().min(1).max(120),
  effects: z
    .record(z.string(), z.unknown())
    .default({}),
});

export const generatedNodeSchema = z.object({
  key: z.string().min(1).max(120),
  nodeType: z.enum([
    "narrative",
    "choice",
    "ending",
  ]),
  title: z.string().max(300).optional(),
  body: z.string().min(1).max(12000),
  ambience: z.array(z.string().max(160)).max(8).default([]),
  imagePrompt: z.string().max(2000).optional(),
  choices: z.array(generatedChoiceSchema).max(6).default([]),
});

export const generatedQuestionSchema = z.object({
  questionType: z.enum([
    "comprehension",
    "reflection",
    "prediction",
    "emotion",
  ]),
  prompt: z.string().min(1).max(1000),
  ageBand: z.string().max(40),
  expectedSignals: z.array(z.string()).max(12).default([]),
});

export const generatedStorySchema = z.object({
  title: z.string().min(1).max(300),
  summary: z.string().min(1).max(2000),
  ageBand: z.string().max(40),
  themes: z.array(z.string().max(120)).max(12),
  startNodeKey: z.string().min(1).max(120),
  nodes: z.array(generatedNodeSchema).min(1).max(80),
  questions: z
    .array(generatedQuestionSchema)
    .max(12)
    .default([]),
  metadata: z
    .record(z.string(), z.unknown())
    .default({}),
});

export type GeneratedStory = z.infer<
  typeof generatedStorySchema
>;
