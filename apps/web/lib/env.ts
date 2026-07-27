import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url().default("postgresql://lumi:lumi_local_only@localhost:15432/lumi"),
  REDIS_URL: z.url().default("redis://localhost:16379"),
  AUTH_COOKIE_SECURE: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "production" ? "true" : "false")
    .transform((value) => value === "true"),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
});

export const publicEnvironment = publicEnvironmentSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const serverEnvironment = serverEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
  AUTH_RATE_LIMIT_MAX_REQUESTS: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_WINDOW_MS: process.env.AUTH_RATE_LIMIT_WINDOW_MS,
});
