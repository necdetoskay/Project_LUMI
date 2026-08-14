import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { generateCharacterOriginSuggestions } from "@lumi/profiles/application";
export async function POST(request: Request) {
  return withParent(async (parent) => {
    const body = (await request.json()) as {
      householdId?: string;
      childProfileId?: string;
    };
    if (!body.householdId || !body.childProfileId)
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    try {
      return NextResponse.json(
        await generateCharacterOriginSuggestions(parent.id, {
          householdId: body.householdId,
          childProfileId: body.childProfileId,
        }),
      );
    } catch (error) {
      const message = (error as Error).message;
      return NextResponse.json(
        { error: message },
        {
          status: message.includes("REQUIRED")
            ? 409
            : message.includes("NOT_CONFIGURED")
              ? 503
              : 502,
        },
      );
    }
  });
}
