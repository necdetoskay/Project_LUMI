import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { createHousehold } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = await readRequestBody(request);

    const parsed = body as Record<string, unknown>;
    if (!parsed || typeof parsed.name !== "string" || typeof parsed.slug !== "string") {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "name and slug are required" },
        { status: 400 },
      );
    }

    try {
      const household = await createHousehold(parent.id, {
        name: parsed.name,
        slug: parsed.slug,
      });

      return NextResponse.json({ household }, { status: 201 });
    } catch (error) {
      const err = error as Error & { code?: string };
      const message = err.message ?? "Unknown error";
      console.error("createHousehold failed", { parentId: parent.id, message, error });
      if (err.code === "HOUSEHOLD_EXISTS" || message.includes("HOUSEHOLD_EXISTS")) {
        return NextResponse.json(
          { error: "HOUSEHOLD_EXISTS", message: "User already owns a household" },
          { status: 409 },
        );
      }
      if (message.includes("ValidationError") || message.includes("validation")) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: `Failed to create household: ${message}` },
        { status: 500 },
      );
    }
  });
});
