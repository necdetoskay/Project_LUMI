import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { archiveChildProfile } from "@lumi/profiles/application";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
      await archiveChildProfile(parent.id, profileId, parsed.householdId);
      return NextResponse.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not a member")) {
        return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to archive profile" },
        { status: 500 },
      );
    }
  });
}
