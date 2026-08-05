import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import {
  grantConsentForHousehold,
  listConsents,
  listConsentsForChild,
} from "@lumi/privacy/application";
import type { GrantConsentInput } from "@lumi/privacy/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    const childProfileId = searchParams.get("childProfileId");

    if (!householdId) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "householdId query parameter is required",
        },
        { status: 400 },
      );
    }

    try {
      const consents = childProfileId
        ? await listConsentsForChild(
            parent.id,
            householdId,
            childProfileId,
          )
        : await listConsents(parent.id, householdId);
      return NextResponse.json({ consents });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (
        message.includes("not a member") ||
        message.includes("UNAUTHORIZED")
      ) {
        return NextResponse.json(
          { error: "FORBIDDEN", message },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to list consents" },
        { status: 500 },
      );
    }
  });
});

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = await readRequestBody(request);
    const parsed = body as Record<string, unknown>;

    if (
      !parsed ||
      typeof parsed.householdId !== "string" ||
      typeof parsed.consentType !== "string"
    ) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "householdId and consentType are required",
        },
        { status: 400 },
      );
    }

    const input: GrantConsentInput = {
      householdId: parsed.householdId,
      consentType: parsed.consentType,
    };
    if (typeof parsed.childProfileId === "string") {
      input.childProfileId = parsed.childProfileId;
    }

    try {
      const consent = await grantConsentForHousehold(parent.id, input);
      return NextResponse.json({ consent }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (
        message.includes("not a member") ||
        message.includes("UNAUTHORIZED")
      ) {
        return NextResponse.json(
          { error: "FORBIDDEN", message },
          { status: 403 },
        );
      }
      if (
        message.includes("INVALID_CONSENT_TYPE") ||
        message.includes("validation") ||
        message.includes("ValidationError")
      ) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to grant consent" },
        { status: 500 },
      );
    }
  });
});
