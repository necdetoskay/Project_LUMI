import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { getPolicy, updatePolicy } from "@lumi/profiles/application";
import type { UpdatePolicyInput } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
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
      const policy = await getPolicy(householdId, parent.id);
      if (!policy) {
        return NextResponse.json(
          {
            error: "NOT_FOUND",
            message: "Policy not found for this household",
          },
          { status: 404 },
        );
      }
      return NextResponse.json({ policy });
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
        { error: "INTERNAL_ERROR", message: "Failed to get policy" },
        { status: 500 },
      );
    }
  });
});

export const PUT = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = await readRequestBody(request);
    const parsed = body as Record<string, unknown>;

    if (!parsed || typeof parsed.householdId !== "string") {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "householdId is required" },
        { status: 400 },
      );
    }

    try {
      const input: UpdatePolicyInput = {};
      if (parsed.maxDailyStories !== undefined) {
        input.maxDailyStories = parsed.maxDailyStories as number;
      }
      if (parsed.contentBoundary !== undefined) {
        input.contentBoundary = parsed.contentBoundary as string;
      }
      if (parsed.timeLimitMinutes !== undefined) {
        input.timeLimitMinutes = parsed.timeLimitMinutes as number | null;
      }
      if (parsed.requireParentApprovalForAi !== undefined) {
        input.requireParentApprovalForAi =
          parsed.requireParentApprovalForAi as boolean;
      }
      if (parsed.allowImageGeneration !== undefined) {
        input.allowImageGeneration = parsed.allowImageGeneration as boolean;
      }
      if (parsed.allowTts !== undefined) {
        input.allowTts = parsed.allowTts as boolean;
      }
      if (parsed.blockedTopics !== undefined) {
        input.blockedTopics = parsed.blockedTopics as string[];
      }
      if (parsed.customNotes !== undefined) {
        input.customNotes = parsed.customNotes as string[];
      }

      const policy = await updatePolicy(parsed.householdId, parent.id, input);

      return NextResponse.json({ policy });
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
        message.includes("validation") ||
        message.includes("ValidationError")
      ) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to update policy" },
        { status: 500 },
      );
    }
  });
});
