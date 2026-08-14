import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { chooseCharacterIdentity } from "@lumi/profiles/application";

export async function POST(request: Request) {
  return withParent(async (parent) => {
    const body = (await request.json()) as {
      householdId?: string;
      childProfileId?: string;
      suggestion?: {
        key?: string;
        name?: string;
        identity?: string;
        traits?: string[];
        fitReason?: string;
      };
    };
    const s = body.suggestion;
    if (
      !body.householdId ||
      !body.childProfileId ||
      !s ||
      ![s.key, s.name, s.identity, s.fitReason].every(
        (v) => typeof v === "string" && v.trim(),
      ) ||
      !Array.isArray(s.traits) ||
      s.traits.length !== 3 ||
      !s.traits.every((v) => typeof v === "string" && v.trim())
    )
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    try {
      return NextResponse.json({
        cycle: await chooseCharacterIdentity(parent.id, {
          householdId: body.householdId,
          childProfileId: body.childProfileId,
          suggestion: {
            key: s.key!,
            name: s.name!,
            identity: s.identity!,
            traits: s.traits as [string, string, string],
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
