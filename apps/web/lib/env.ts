import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url().default("postgresql://lumi:lumi_local_only@localhost:15432/lumi"),
  REDIS_URL: z.url().default("redis://localhost:16379"),
});

export const publicEnvironment = publicEnvironmentSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const serverEnvironment = serverEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
});
