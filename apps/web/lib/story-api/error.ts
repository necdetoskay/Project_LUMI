import { NextResponse } from "next/server";
import { z } from "zod";

export function handleStoryError(error: unknown, fallbackMessage: string) {
  const err = error as Error & { code?: string };
  const message = err.message ?? "Unknown error";

  if (
    err.name === "AuthorizationError" ||
    message.includes("not a member") ||
    message.includes("not accessible")
  ) {
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
  if (err.name === "NotFoundError") {
    return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
  }
  if (err.name === "ValidationError") {
    const conflictCodes = [
      "VERSION_NOT_PUBLISHED",
      "SESSION_ALREADY_EXISTS",
      "INVALID_TRANSITION",
      "VERSION_CONFLICT",
    ];
    const status = conflictCodes.includes(err.code ?? "") ? 409 : 400;
    return NextResponse.json(
      { error: err.code ?? "VALIDATION_ERROR", message },
      { status },
    );
  }
  if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
    return NextResponse.json(
      { error: "VERSION_CONFLICT", message },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: fallbackMessage },
    { status: 500 },
  );
}

export async function validateHouseholdAccess(
  parentId: string,
  householdId: string,
  getOwnedHousehold: (parentId: string) => Promise<{ id: string } | null>,
) {
  const household = await getOwnedHousehold(parentId);
  if (!household || household.id !== householdId) {
    return false;
  }
  return true;
}

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

export const sessionStateBodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().min(1).optional(),
});

export const advanceBodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  nextSceneId: z.string().uuid(),
  idempotencyKey: z.string().min(1).optional(),
});

export const abandonBodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  reason: z.string().min(1).max(500).optional(),
  idempotencyKey: z.string().min(1).optional(),
});

export const checkpointBodySchema = z.object({
  sceneId: z.string().uuid(),
});

export const householdQuerySchema = z.object({
  householdId: z.string().uuid(),
});
