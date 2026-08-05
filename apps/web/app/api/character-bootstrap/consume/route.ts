import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import type { OriginPackageInput } from "@lumi/profiles/application";
import { consumeHandoffAndCreateCharacter } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

function statusForDomainError(code?: string): number | null {
  switch (code) {
    case "FORBIDDEN":
      return 403;
    case "PROFILE_ARCHIVED":
    case "INVALID_CUSTOM_PROPERTY":
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
    const body = await readRequestBody(request);
    const parsed = body as Record<string, unknown>;

    if (
      !parsed ||
      typeof parsed.householdId !== "string" ||
      typeof parsed.childProfileId !== "string" ||
      typeof parsed.handoffId !== "string" ||
      typeof parsed.originPackageId !== "string"
    ) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message:
            "householdId, childProfileId, handoffId, originPackageId are required",
        },
        { status: 400 },
      );
    }

    try {
      const overrides =
        parsed.manualOverrides && typeof parsed.manualOverrides === "object"
          ? (parsed.manualOverrides as {
              name?: string;
              subtype?: string;
              originConcept?: string;
              startingLocation?: string;
              homeArchetype?: string;
            })
          : undefined;
      const input: OriginPackageInput = overrides
        ? {
            householdId: parsed.householdId,
            childProfileId: parsed.childProfileId,
            handoffId: parsed.handoffId,
            originPackageId: parsed.originPackageId,
            manualOverrides: overrides,
          }
        : {
            householdId: parsed.householdId,
            childProfileId: parsed.childProfileId,
            handoffId: parsed.handoffId,
            originPackageId: parsed.originPackageId,
          };
      const result = await consumeHandoffAndCreateCharacter(parent.id, input);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
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
        { error: "INTERNAL_ERROR", message: "Failed to consume handoff" },
        { status: 500 },
      );
    }
  });
}, "/api/character-bootstrap/consume");
