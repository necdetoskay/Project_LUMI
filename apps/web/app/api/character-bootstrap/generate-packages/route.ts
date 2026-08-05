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

const generatePackagesSchema = z
  .object({
    householdId: z.string().uuid(),
    childProfileId: z.string().uuid(),
  })
  .strict();

function statusForDomainError(code?: string): number | null {
  switch (code) {
    case "FORBIDDEN":
      return 403;
    case "PROFILE_ARCHIVED":
    case "INVALID_CHARACTER_TYPE":
    case "INVALID_ORIGIN_MODE":
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
            message: error.issues
              .map((issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; "),
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
        { error: "INTERNAL_ERROR", message: "Failed to generate packages" },
        { status: 500 },
      );
    }
  });
}, "/api/character-bootstrap/generate-packages");
