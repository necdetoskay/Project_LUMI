import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import type { OriginPackageInput } from "@lumi/profiles/application";
import { consumeHandoffAndCreateCharacter } from "@lumi/profiles/application";

export async function POST(request: Request) {
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
      if (err.name === "AuthorizationError" || message.includes("not a member")) {
        return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
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
      if (message.includes("PROFILE_ARCHIVED")) {
        return NextResponse.json(
          { error: "ARCHIVED_PROFILE", message },
          { status: 409 },
        );
      }
      if (
        err.name === "NotFoundError" ||
        message.includes("Unknown OriginPackage") ||
        message.includes("Unknown FirstRunHandoff") ||
        message.includes("Unknown ChildProfile") ||
        message.includes("Unknown profile")
      ) {
        return NextResponse.json(
          { error: "NOT_FOUND", message },
          { status: 404 },
        );
      }
      if (err.name === "ValidationError" || message.includes("ValidationError")) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to consume handoff" },
        { status: 500 },
      );
    }
  });
}
