import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") ||
        value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),

  DATABASE_MAX_CONNECTIONS: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10),

  DATABASE_IDLE_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(20),

  DATABASE_CONNECT_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(10),

  DB_LOGGING: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Environment validation failed");
}

export const env = parsed.data;
