import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { getOnboardingState } from "@lumi/profiles/application";

export async function GET() {
  return withParent(async (parent) => {
    try {
      const state = await getOnboardingState(parent.id);
      return NextResponse.json({ onboarding: state });
    } catch {
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to get onboarding state" },
        { status: 500 },
      );
    }
  });
}
