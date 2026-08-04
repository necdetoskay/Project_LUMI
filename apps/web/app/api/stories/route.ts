import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { getStoryCatalog } from "@lumi/story/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

const querySchema = z.object({
  householdId: z.string().uuid(),
});

function handleStoryError(error: unknown) {
  const err = error as Error & { code?: string };
  const message = err.message ?? "Unknown error";

  if (err.name === "AuthorizationError" || message.includes("not a member")) {
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
  if (err.name === "NotFoundError") {
    return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
  }
  if (err.name === "ValidationError") {
    return NextResponse.json(
      { error: err.code ?? "VALIDATION_ERROR", message },
      { status: 400 },
    );
  }
  if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
    return NextResponse.json(
      { error: "VERSION_CONFLICT", message },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Story request failed" },
    { status: 500 },
  );
}

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      householdId: searchParams.get("householdId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "householdId query parameter is required and must be a UUID",
        },
        { status: 400 },
      );
    }

    const { householdId } = parsed.data;

    const household = await getOwnedHousehold(parent.id);
    if (!household || household.id !== householdId) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "User does not have access to this household",
        },
        { status: 403 },
      );
    }

    try {
      const catalog = await getStoryCatalog(householdId);
      return NextResponse.json({ catalog });
    } catch (error) {
      return handleStoryError(error);
    }
  });
}, "/api/stories");
