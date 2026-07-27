import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { createHousehold } from "@lumi/profiles/application";

export async function POST(request: Request) {
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
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("HOUSEHOLD_EXISTS")) {
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
        { error: "INTERNAL_ERROR", message: "Failed to create household" },
        { status: 500 },
      );
    }
  });
}
