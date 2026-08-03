import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import type { StoryPreferenceMetadata } from "@lumi/profiles/domain";
import { createOrReplaceFirstRunHandoff } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

const handoffSchema = z.object({
  householdId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  characterType: z.enum(["explorer", "inventor", "storyteller", "helper", "dreamer"]),
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
}).strict();

export const POST = observeHandler(
  (request: Request) => {
    return withParent(async (parent) => {
      try {
        const body = await readRequestBody(request);
        const parsed = handoffSchema.parse(body);
        const { preferenceHints: rawHints, ...rest } = parsed;

        const preferenceHints: StoryPreferenceMetadata | undefined = rawHints
          ? {
              ...(rawHints.preferredThemes ? { preferredThemes: rawHints.preferredThemes } : {}),
              ...(rawHints.avoidedThemes ? { avoidedThemes: rawHints.avoidedThemes } : {}),
              ...(rawHints.favoriteCharacterTypes ? { favoriteCharacterTypes: rawHints.favoriteCharacterTypes } : {}),
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
              message: error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join("; "),
            },
            { status: 400 },
          );
        }
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (
          message.includes("ALREADY_CONSUMED") ||
          message.includes("CHARACTER_ALREADY_EXISTS")
        ) {
          return NextResponse.json(
            { error: "CONFLICT", message },
            { status: 409 },
          );
        }
        if (message.includes("PROFILE_ARCHIVED")) {
          return NextResponse.json(
            { error: "ARCHIVED_PROFILE", message },
            { status: 409 },
          );
        }
        if (
          err.name === "ValidationError" ||
          message.includes("ValidationError") ||
          message.startsWith("INVALID_")
        ) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to create handoff" },
          { status: 500 },
        );
      }
    });
  },
  "/api/character-bootstrap/handoff"

);
