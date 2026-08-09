import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";
import {
  getChildPersonalization,
  updateChildPersonalization,
} from "@lumi/profiles/application";

function getHouseholdId(request: Request) {
  return new URL(request.url).searchParams.get("householdId");
}

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.includes("not a member")) {
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
  if (message.includes("not found")) {
    return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
  }
  if (message.includes("ValidationError")) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Personalization request failed" },
    { status: 500 },
  );
}

export const GET = observeHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
    withParent(async (parent) => {
      const householdId = getHouseholdId(request);
      if (!householdId) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "householdId is required" },
          { status: 400 },
        );
      }
      try {
        const personalization = await getChildPersonalization(
          parent.id,
          (await params).id,
          householdId,
        );
        return NextResponse.json({ personalization });
      } catch (error) {
        return handleError(error);
      }
    }),
  "/api/child-profiles/{id}/personalization",
);

export const PUT = observeHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
    withParent(async (parent) => {
      const body = (await readRequestBody(request)) as Record<string, unknown>;
      if (!body || typeof body.householdId !== "string") {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "householdId is required" },
          { status: 400 },
        );
      }
      const interests = stringArray(body.interests);
      const customInterests = stringArray(body.customInterests);
      const developmentGoals = stringArray(body.developmentGoals);
      if (!interests || !customInterests || !developmentGoals) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "personalization fields must be string arrays",
          },
          { status: 400 },
        );
      }
      try {
        const personalization = await updateChildPersonalization(
          parent.id,
          (await params).id,
          body.householdId,
          {
            interests: interests as never[],
            customInterests,
            developmentGoals: developmentGoals as never[],
          },
        );
        return NextResponse.json({ personalization });
      } catch (error) {
        return handleError(error);
      }
    }),
  "/api/child-profiles/{id}/personalization",
);
