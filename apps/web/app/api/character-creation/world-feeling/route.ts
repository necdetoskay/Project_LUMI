import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import {
  chooseWorldFeeling,
  type WorldFeelingKey,
} from "@lumi/profiles/application";

const FEELINGS: WorldFeelingKey[] = [
  "oceanic",
  "sky_islands",
  "enchanted_forest",
  "crystal_caverns",
  "desert_ruins",
  "living_city",
];

export async function POST(request: Request) {
  return withParent(async (parent) => {
    const body = (await request.json()) as {
      householdId?: string;
      childProfileId?: string;
      feeling?: WorldFeelingKey;
    };
    if (
      !body.householdId ||
      !body.childProfileId ||
      !body.feeling ||
      !FEELINGS.includes(body.feeling)
    )
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    try {
      const cycle = await chooseWorldFeeling(parent.id, {
        householdId: body.householdId,
        childProfileId: body.childProfileId,
        feeling: body.feeling,
      });
      return NextResponse.json({ cycle });
    } catch (error) {
      const err = error as Error;
      if (err.name === "AuthorizationError")
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      if (err.message.includes("World-first"))
        return NextResponse.json({ error: "INVALID_CYCLE" }, { status: 409 });
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  });
}
