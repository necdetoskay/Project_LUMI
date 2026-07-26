import { z } from "zod";
import { successEnvelope } from "./common";

export const foundationResponseSchema = successEnvelope(
  z.object({
    household: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
    child: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
    universe: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
    world: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
    region: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
    location: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
    character: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
    inventory: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
  }),
);
