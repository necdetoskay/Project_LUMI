import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { finalizeCharacterOnboarding } from "@/lib/character-onboarding/finalize-character-foundation.service";
import {
  chooseCharacterCreationDirection,
  chooseCharacterIdentity,
  getActiveCharacterCreationCycle,
} from "@lumi/profiles/application";
import {
  chooseCanonicalCharacterType,
  chooseCompatibility,
  chooseCoreSagaSuggestion,
  chooseOriginSuggestion,
  chooseRegionSuggestion,
  chooseUniverse,
  chooseWorldSuggestion,
  generateCompatibilitySuggestions,
  generateCoreSagaSuggestions,
  generateRegionSuggestions,
  generateWorldSuggestions,
} from "../../../../../../packages/profiles/src/application/character-foundation-onboarding.service";
import { generateCharacterFirstIdentitySuggestions } from "../../../../../../packages/profiles/src/application/character-first-identity-suggestion.service";
import { generateCharacterOriginSuggestions } from "../../../../../../packages/profiles/src/application/character-origin-suggestion.service";

type Body = {
  action?: string;
  householdId?: string;
  childProfileId?: string;
  characterType?: "human" | "animal" | "fantastic" | "synthetic";
  universe?: { key: string; name: string };
  suggestion?: Record<string, unknown>;
};

function validation(message: string) {
  return NextResponse.json(
    { error: "VALIDATION_ERROR", message },
    { status: 400 },
  );
}

function serviceError(error: unknown) {
  const err = error as Error;
  if (err.name === "AuthorizationError")
    return NextResponse.json(
      { error: "FORBIDDEN", message: err.message },
      { status: 403 },
    );
  if (err.message?.startsWith("ONBOARDING_STEP_OUT_OF_ORDER"))
    return NextResponse.json(
      { error: "STEP_OUT_OF_ORDER", message: err.message },
      { status: 409 },
    );
  return NextResponse.json(
    {
      error: "ONBOARDING_ERROR",
      message: err.message || "Unknown onboarding error",
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  return withParent(async (parent) => {
    const params = new URL(request.url).searchParams;
    const householdId = params.get("householdId");
    const childProfileId = params.get("childProfileId");
    if (!householdId || !childProfileId)
      return validation("householdId and childProfileId are required");
    try {
      const cycle = await getActiveCharacterCreationCycle(
        parent.id,
        householdId,
        childProfileId,
      );
      return NextResponse.json({ cycle });
    } catch (error) {
      return serviceError(error);
    }
  });
}

export async function POST(request: Request) {
  return withParent(async (parent) => {
    const body = (await request.json()) as Body;
    if (!body.householdId || !body.childProfileId || !body.action)
      return validation("action, householdId and childProfileId are required");
    const input = {
      householdId: body.householdId,
      childProfileId: body.childProfileId,
    };
    try {
      switch (body.action) {
        case "start":
          return NextResponse.json({
            cycle: await chooseCharacterCreationDirection(parent.id, {
              ...input,
              direction: "character_first",
            }),
          });
        case "select-character-type":
          if (!body.characterType)
            return validation("characterType is required");
          return NextResponse.json({
            cycle: await chooseCanonicalCharacterType(parent.id, {
              ...input,
              characterType: body.characterType,
            }),
          });
        case "generate-identity":
          return NextResponse.json(
            await generateCharacterFirstIdentitySuggestions(parent.id, input),
          );
        case "select-identity":
          return NextResponse.json({
            cycle: await chooseCharacterIdentity(parent.id, {
              ...input,
              suggestion: body.suggestion as never,
            }),
          });
        case "select-universe":
          if (!body.universe) return validation("universe is required");
          return NextResponse.json({
            cycle: await chooseUniverse(parent.id, {
              ...input,
              universe: body.universe,
            }),
          });
        case "generate-world":
          return NextResponse.json(
            await generateWorldSuggestions(parent.id, input),
          );
        case "select-world":
          return NextResponse.json({
            cycle: await chooseWorldSuggestion(parent.id, {
              ...input,
              suggestion: body.suggestion as never,
            }),
          });
        case "generate-compatibility":
          return NextResponse.json(
            await generateCompatibilitySuggestions(parent.id, input),
          );
        case "select-compatibility":
          return NextResponse.json({
            cycle: await chooseCompatibility(parent.id, {
              ...input,
              suggestion: body.suggestion as never,
            }),
          });
        case "generate-region":
          return NextResponse.json(
            await generateRegionSuggestions(parent.id, input),
          );
        case "select-region":
          return NextResponse.json({
            cycle: await chooseRegionSuggestion(parent.id, {
              ...input,
              suggestion: body.suggestion as never,
            }),
          });
        case "generate-origin":
          return NextResponse.json(
            await generateCharacterOriginSuggestions(parent.id, input),
          );
        case "select-origin":
          return NextResponse.json({
            cycle: await chooseOriginSuggestion(parent.id, {
              ...input,
              suggestion: body.suggestion as never,
            }),
          });
        case "generate-saga":
          return NextResponse.json(
            await generateCoreSagaSuggestions(parent.id, input),
          );
        case "select-saga":
          return NextResponse.json({
            cycle: await chooseCoreSagaSuggestion(parent.id, {
              ...input,
              suggestion: body.suggestion as never,
            }),
          });
        case "finalize": {
          const committed = await finalizeCharacterOnboarding(parent.id, input);
          return NextResponse.json({
            characterId: committed.characterId,
            worldId: committed.world.worldId,
          });
        }
        default:
          return validation(`Unknown action: ${body.action}`);
      }
    } catch (error) {
      return serviceError(error);
    }
  });
}
