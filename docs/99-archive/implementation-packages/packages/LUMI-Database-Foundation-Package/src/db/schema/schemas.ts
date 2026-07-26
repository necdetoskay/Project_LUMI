import { pgSchema } from "drizzle-orm/pg-core";

export const identitySchema = pgSchema("identity");
export const profileSchema = pgSchema("profile");
export const worldSchema = pgSchema("world");
export const characterSchema = pgSchema("character");
export const storySchema = pgSchema("story");
export const simulationSchema = pgSchema("simulation");
export const memorySchema = pgSchema("memory");
export const inventorySchema = pgSchema("inventory");
export const educationSchema = pgSchema("education");
export const mediaSchema = pgSchema("media");
export const aiSchema = pgSchema("ai");
export const auditSchema = pgSchema("audit");
export const systemSchema = pgSchema("system");
