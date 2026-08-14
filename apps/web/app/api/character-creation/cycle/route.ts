import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { chooseCharacterCreationDirection, getActiveCharacterCreationCycle } from "@lumi/profiles/application";

export async function GET(request: Request) {
  return withParent(async (parent) => {
    const params = new URL(request.url).searchParams;
    const householdId = params.get("householdId");
    const childProfileId = params.get("childProfileId");
    if (!householdId || !childProfileId) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    try {
      const cycle = await getActiveCharacterCreationCycle(parent.id, householdId, childProfileId);
      return NextResponse.json({ cycle });
    } catch (error) {
      const err = error as Error;
      if (err.name === "AuthorizationError") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  });
}

export async function POST(request: Request) {
  return withParent(async (parent) => {
    const body = (await request.json()) as { householdId?: string; childProfileId?: string; direction?: "character_first" | "world_first" };
    if (!body.householdId || !body.childProfileId || !["character_first", "world_first"].includes(body.direction ?? "")) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    try {
      const cycle = await chooseCharacterCreationDirection(parent.id, { householdId: body.householdId, childProfileId: body.childProfileId, direction: body.direction! });
      return NextResponse.json({ cycle });
    } catch (error) {
      const err = error as Error;
      if (err.name === "AuthorizationError") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  });
}
