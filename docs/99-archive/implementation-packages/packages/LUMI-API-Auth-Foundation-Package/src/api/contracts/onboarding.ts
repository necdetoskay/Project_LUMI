import { z } from "zod";
import { successEnvelope } from "./common";

export const createHouseholdRequestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
});

export const householdResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export const createChildRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  birthYear: z.number().int().min(2010).max(2100).optional(),
});

export const childResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  birthYear: z.number().int().nullable().optional(),
});

export const createWorldRequestSchema = z.object({
  universeName: z.string().trim().min(2).max(160),
  universeSlug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
  worldName: z.string().trim().min(2).max(160),
  worldSlug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
  regionName: z.string().trim().min(2).max(160),
  regionSlug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
  locationName: z.string().trim().min(2).max(160),
  locationSlug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
});

export const createAvatarRequestSchema = z.object({
  childProfileId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
  currentLocationId: z.string().uuid(),
});

export const createHouseholdResponseSchema = successEnvelope(householdResponseSchema);
export const createChildResponseSchema = successEnvelope(childResponseSchema);
