import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { getCharacterBootstrapStatus } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

const statusParamsSchema = z.object({
  householdId: z.string().uuid(),
  childProfileId: z.string().uuid(),
});

export const GET = observeHandler(
  (request: Request) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);

      const queryResult = statusParamsSchema.safeParse({
        householdId: searchParams.get("householdId"),
        childProfileId: searchParams.get("childProfileId"),
      });
      if (!queryResult.success) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: queryResult.error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join("; "),
          },
          { status: 400 },
        );
      }
      const { householdId, childProfileId } = queryResult.data;

      try {
        const status = await getCharacterBootstrapStatus(
          parent.id,
          householdId,
          childProfileId,
        );
        return NextResponse.json({ status });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (err.name === "NotFoundError" || message.startsWith("Unknown profile")) {
          return NextResponse.json(
            { error: "NOT_FOUND", message },
            { status: 404 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to read bootstrap status" },
          { status: 500 },
        );
      }
    });
  },
  "/api/character-bootstrap/status"

);
