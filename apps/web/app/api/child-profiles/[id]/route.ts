import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import {
  updateChildProfile,
  findChildProfileForUser,
} from "@lumi/profiles/application";
import type { UpdateChildProfileInput } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const profileId = (await params).id;
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");

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
        const profile = await findChildProfileForUser(
          profileId,
          parent.id,
          householdId,
        );

        if (!profile) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Profile not found" },
            { status: 404 },
          );
        }

        return NextResponse.json({ profile });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not a member")) {
          return NextResponse.json(
            { error: "FORBIDDEN", message },
            { status: 403 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to get profile" },
          { status: 500 },
        );
      }
    });
  },
  "/api/child-profiles/{id}",
);

export const PATCH = observeHandler(
  (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const profileId = (await params).id;
      const body = await readRequestBody(request);
      const parsed = body as Record<string, unknown>;

      if (!parsed || typeof parsed.householdId !== "string") {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "householdId is required" },
          { status: 400 },
        );
      }

      try {
        const input: UpdateChildProfileInput = {};
        if (parsed.displayName !== undefined) {
          input.displayName = parsed.displayName as string;
        }
        if (parsed.ageBand !== undefined) {
          input.ageBand = parsed.ageBand as string;
        }
        if (parsed.ageYears !== undefined) {
          if (typeof parsed.ageYears !== "number") {
            return NextResponse.json(
              {
                error: "VALIDATION_ERROR",
                message: "ageYears must be a number",
              },
              { status: 400 },
            );
          }
          input.ageYears = parsed.ageYears;
        }

        const profile = await updateChildProfile(
          parent.id,
          profileId,
          parsed.householdId,
          input,
        );

        return NextResponse.json({ profile });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not a member")) {
          return NextResponse.json(
            { error: "FORBIDDEN", message },
            { status: 403 },
          );
        }
        if (message.includes("not found")) {
          return NextResponse.json(
            { error: "NOT_FOUND", message },
            { status: 404 },
          );
        }
        if (
          message.includes("validation") ||
          message.includes("ValidationError")
        ) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to update profile" },
          { status: 500 },
        );
      }
    });
  },
  "/api/child-profiles/{id}",
);
