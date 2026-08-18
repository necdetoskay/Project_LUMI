import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { getAiGenerationContextInspectorTrace } from "@lumi/profiles";
import { getOwnedHousehold } from "@lumi/profiles/application";

const paramsSchema = z.object({
  traceId: z.string().uuid(),
});

export const GET = observeHandler(
  async (
    _request: Request,
    { params }: { params: Promise<{ traceId: string }> },
  ) => {
    return withParent(async (parent) => {
      const parsedParams = paramsSchema.safeParse(await params);
      if (!parsedParams.success) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: parsedParams.error.message,
          },
          { status: 400 },
        );
      }

      const household = await getOwnedHousehold(parent.id);
      if (!household) {
        return NextResponse.json(
          {
            error: "NOT_FOUND",
            message: "Owned household was not found",
          },
          { status: 404 },
        );
      }

      const trace = await getAiGenerationContextInspectorTrace(
        household.id,
        parsedParams.data.traceId,
      );
      if (!trace) {
        return NextResponse.json(
          {
            error: "NOT_FOUND",
            message: "AI generation trace was not found",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({ trace });
    });
  },
  "/api/settings/context-inspector/traces/{traceId}",
);
