import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { chooseWorldCharacterSuggestion } from "@lumi/profiles/application";
export async function POST(request: Request) {
  return withParent(async (parent) => {
    const body = (await request.json()) as {
      householdId?: string;
      childProfileId?: string;
      suggestion?: {
        key?: string;
        name?: string;
        description?: string;
        fitReason?: string;
      };
    };
    const s = body.suggestion;
    if (
      !body.householdId ||
      !body.childProfileId ||
      !s ||
      ![s.key, s.name, s.description, s.fitReason].every(
        (v) => typeof v === "string" && v.trim(),
      )
    )
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    try {
      return NextResponse.json({
        cycle: await chooseWorldCharacterSuggestion(parent.id, {
          householdId: body.householdId,
          childProfileId: body.childProfileId,
          suggestion: {
            key: s.key!,
            name: s.name!,
            description: s.description!,
            fitReason: s.fitReason!,
          },
        }),
      });
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 409 },
      );
    }
  });
}
