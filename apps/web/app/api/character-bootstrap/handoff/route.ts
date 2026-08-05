import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import type { StoryPreferenceMetadata } from "@lumi/profiles/domain";
import { createOrReplaceFirstRunHandoff } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

const handoffSchema = z
  .object({
    householdId: z.string().uuid(),
    childProfileId: z.string().uuid(),
    characterType: z.enum([
      "explorer",
      "inventor",
      "storyteller",
      "helper",
      "dreamer",
    ]),
    originMode: z.enum(["manual", "auto"]),
    archetypeBatchId: z.string().uuid(),
    archetypeId: z.string().uuid(),
    preferenceHints: z
      .object({
        preferredThemes: z.array(z.string().max(100)).max(10).optional(),
        avoidedThemes: z.array(z.string().max(100)).max(10).optional(),
        favoriteCharacterTypes: z.array(z.string().max(100)).max(10).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

function statusForDomainError(code?: string): number | null {
  switch (code) {
    case "FORBIDDEN":
      return 403;
    case "PROFILE_ARCHIVED":
    case "ARCHETYPE_BATCH_NOT_FOUND":
    case "ARCHETYPE_BATCH_PROFILE_MISMATCH":
    case "ARCHETYPE_BATCH_EXPIRED":
    case "ARCHETYPE_NOT_IN_BATCH":
    case "ARCHETYPE_TYPE_MISMATCH":
    case "INVALID_ARCHETYPE_DATA":
      return 400;
    case "HANDOFF_ALREADY_CONSUMED":
    case "CHARACTER_ALREADY_EXISTS":
    case "ALREADY_CONSUMED":
      return 409;
    case "NOT_FOUND":
      return 404;
    default:
      return null;
  }
}

export const POST = observeHandler((request: Request) => {
  return withParent(async (parent) => {
    try {
      const body = await readRequestBody(request);
      const parsed = handoffSchema.parse(body);
      const { preferenceHints: rawHints, ...rest } = parsed;

      const preferenceHints: StoryPreferenceMetadata | undefined = rawHints
        ? {
            ...(rawHints.preferredThemes
              ? { preferredThemes: rawHints.preferredThemes }
              : {}),
            ...(rawHints.avoidedThemes
              ? { avoidedThemes: rawHints.avoidedThemes }
              : {}),
            ...(rawHints.favoriteCharacterTypes
              ? { favoriteCharacterTypes: rawHints.favoriteCharacterTypes }
              : {}),
          }
        : undefined;
      const input = preferenceHints ? { ...rest, preferenceHints } : rest;
      const result = await createOrReplaceFirstRunHandoff(parent.id, input);
      return NextResponse.json({ handoff: result }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: error.issues
              .map((issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; "),
          },
          { status: 400 },
        );
      }
      const err = error as Error & { code?: string };
      const message = err.message ?? "Unknown error";
      const status = statusForDomainError(err.code);

      if (status) {
        return NextResponse.json(
          { error: err.code ?? "DOMAIN_ERROR", message },
          { status },
        );
      }

      if (
        err.name === "AuthorizationError" ||
        message.includes("not a member")
      ) {
        return NextResponse.json(
          { error: "FORBIDDEN", message },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to create handoff" },
        { status: 500 },
      );
    }
  });
}, "/api/character-bootstrap/handoff");
