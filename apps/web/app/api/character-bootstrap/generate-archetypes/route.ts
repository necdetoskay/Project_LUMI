import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import {
  generateArchetypes,
  LlmGenerationError,
  LlmConfigError,
} from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

const excludedConceptSchema = z
  .object({
    title: z.string().min(2).max(100),
    description: z.string().min(10).max(400),
    personalityHook: z.string().min(5).max(300),
    storyPromise: z.string().min(5).max(300),
  })
  .strict();

const preferenceHintsSchema = z
  .object({
    creativeStyle: z.array(z.string().max(100)).max(10).optional(),
    learningFocus: z.array(z.string().max(100)).max(10).optional(),
    favoriteThemes: z.array(z.string().max(100)).max(10).optional(),
  })
  .strict();

const generateArchetypesSchema = z
  .object({
    householdId: z.string().uuid(),
    childProfileId: z.string().uuid(),
    excludedConcepts: z.array(excludedConceptSchema).max(10).optional(),
    preferenceHints: preferenceHintsSchema.optional(),
  })
  .strict();

export const POST = observeHandler((request: Request) => {
  return withParent(async (parent) => {
    try {
      const body = await readRequestBody(request);
      const parsed = generateArchetypesSchema.parse(body);

      const result = await generateArchetypes(
        parent.id,
        parsed.householdId,
        parsed.childProfileId,
        parsed.excludedConcepts,
        parsed.preferenceHints,
      );
      return NextResponse.json(
        {
          batchId: result.batchId,
          archetypes: result.archetypes,
          modelId: result.modelId,
          generationNonce: result.generationNonce,
          expiresAt: result.expiresAt,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: error.issues
              .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
              .join("; "),
          },
          { status: 400 },
        );
      }
      if (error instanceof LlmConfigError) {
        return NextResponse.json(
          { error: error.code, message: error.message },
          { status: 503 },
        );
      }
      if (error instanceof LlmGenerationError) {
        return NextResponse.json(
          {
            error: "LLM_GENERATION_ERROR",
            fallbackReason: error.message,
          },
          { status: 502 },
        );
      }
      const err = error as Error & { code?: string };
      const message = err.message ?? "Unknown error";
      if (
        err.name === "AuthorizationError" ||
        message.includes("not a member")
      ) {
        return NextResponse.json(
          { error: "FORBIDDEN", message },
          { status: 403 },
        );
      }
      console.error("generateArchetypes failed", {
        parentId: parent.id,
        error,
      });
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to generate archetypes" },
        { status: 500 },
      );
    }
  });
}, "/api/character-bootstrap/generate-archetypes");
