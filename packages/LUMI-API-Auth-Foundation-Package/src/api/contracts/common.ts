import { z } from "zod";

export const requestIdSchema = z.string().min(8).max(160);

export const apiMetaSchema = z.object({
  requestId: requestIdSchema,
});

export const apiErrorDetailSchema = z.object({
  field: z.string().optional(),
  code: z.string(),
  message: z.string(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(apiErrorDetailSchema).optional(),
  }),
  meta: apiMetaSchema,
});

export function successEnvelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    data,
    meta: apiMetaSchema,
  });
}
