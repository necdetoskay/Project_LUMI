import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { listAiGenerationContextInspectorTraces } from "@lumi/profiles";
import { getOwnedHousehold } from "@lumi/profiles/application";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
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

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsedQuery.error.message,
        },
        { status: 400 },
      );
    }

    const traces = await listAiGenerationContextInspectorTraces(
      household.id,
      parsedQuery.data.limit,
    );

    return NextResponse.json({
      household: { id: household.id, name: household.name },
      traces,
    });
  });
}, "/api/settings/context-inspector/traces");
