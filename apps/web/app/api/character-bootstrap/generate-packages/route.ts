import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import {
  generateAndPersistOriginPackages,
  LlmGenerationError,
  LlmConfigError,
} from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

const generatePackagesSchema = z.object({
  householdId: z.string().uuid(),
  childProfileId: z.string().uuid(),
}).strict();

export const POST = observeHandler(
  (request: Request) => {
    return withParent(async (parent) => {
      try {
        const body = await readRequestBody(request);
        const parsed = generatePackagesSchema.parse(body);

        const result = await generateAndPersistOriginPackages(
          parent.id,
          parsed.householdId,
          parsed.childProfileId,
        );
        return NextResponse.json(
          {
            packages: result.packages,
            generationSource: result.source,
            modelId: result.modelId,
            generationBatchId: result.generationBatchId,
          },
          { status: 201 },
        );
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
        if (error instanceof LlmConfigError) {
          return NextResponse.json(
            {
              packages: [],
              generationSource: "llm_config_error",
              modelId: null,
              generationBatchId: null,
              fallbackReason: error.message,
              errorCode: error.code,
            },
            { status: 503 },
          );
        }
        if (error instanceof LlmGenerationError) {
          return NextResponse.json(
            {
              packages: [],
              generationSource: "llm_error",
              modelId: null,
              generationBatchId: null,
              fallbackReason: error.message,
            },
            { status: 502 },
          );
        }
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (message.includes("PROFILE_ARCHIVED")) {
          return NextResponse.json(
            { error: "ARCHIVED_PROFILE", message },
            { status: 409 },
          );
        }
        if (
          message.includes("HANDOFF_ALREADY_CONSUMED") ||
          message.includes("CHARACTER_ALREADY_EXISTS")
        ) {
          return NextResponse.json(
            { error: "CONFLICT", message },
            { status: 409 },
          );
        }
        if (err.name === "ValidationError" || message.includes("ValidationError")) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to generate packages" },
          { status: 500 },
        );
      }
    });
  },
  "/api/character-bootstrap/generate-packages"

);
