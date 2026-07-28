import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import type { StoryPreferenceMetadata } from "@lumi/profiles/domain";
import type { CreateHandoffInput } from "@lumi/profiles/application";
import { createOrReplaceFirstRunHandoff } from "@lumi/profiles/application";

export async function POST(request: Request) {
  return withParent(async (parent) => {
    const body = await readRequestBody(request);
    const parsed = body as Record<string, unknown>;

    if (
      !parsed ||
      typeof parsed.householdId !== "string" ||
      typeof parsed.childProfileId !== "string" ||
      typeof parsed.characterType !== "string" ||
      typeof parsed.originMode !== "string"
    ) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message:
            "householdId, childProfileId, characterType, originMode are required",
        },
        { status: 400 },
      );
    }

    try {
      const prefHints =
        parsed.preferenceHints && typeof parsed.preferenceHints === "object"
          ? (parsed.preferenceHints as StoryPreferenceMetadata)
          : undefined;
      const createInput: CreateHandoffInput = prefHints
        ? {
            householdId: parsed.householdId,
            childProfileId: parsed.childProfileId,
            characterType: parsed.characterType,
            originMode: parsed.originMode,
            preferenceHints: prefHints,
          }
        : {
            householdId: parsed.householdId,
            childProfileId: parsed.childProfileId,
            characterType: parsed.characterType,
            originMode: parsed.originMode,
          };
      const result = await createOrReplaceFirstRunHandoff(parent.id, createInput);
      return NextResponse.json({ handoff: result }, { status: 201 });
    } catch (error) {
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
}
