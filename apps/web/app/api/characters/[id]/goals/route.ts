import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { addGoal, completeGoal } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const POST = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");
      const { id } = await ctx.params;

      if (!householdId) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "householdId query parameter is required" },
          { status: 400 },
        );
      }

      try {
        const body = (await request.json()) as { needType: string; description: string; priority?: number };
        if (!body.needType || !body.description) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "needType and description are required" },
            { status: 400 },
          );
        }

        const result = await addGoal(parent.id, householdId, id, {
          needType: body.needType,
          description: body.description,
          priority: body.priority ?? 1,
        });
        return NextResponse.json({ character: result }, { status: 201 });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "NotFoundError" || err.code === "NOT_FOUND") {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Character not found" },
            { status: 404 },
          );
        }
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (err.name === "NotFoundError" || err.code === "NOT_FOUND") {
          return NextResponse.json({ error: "NOT_FOUND", message: "Character not found" }, { status: 404 });
        }
        if (err.name === "ValidationError") {
          return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
        }
        if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
          return NextResponse.json({ error: "VERSION_CONFLICT", message }, { status: 409 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to add goal" },
          { status: 500 },
        );
      }
    });
  },
  "/api/characters/{id}/goals",
);

export const PATCH = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");
      const { id } = await ctx.params;

      if (!householdId) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "householdId query parameter is required" },
          { status: 400 },
        );
      }

      try {
        const body = (await request.json()) as { action: string; goalId: string };
        if (!body.action || !body.goalId) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "action and goalId are required" },
            { status: 400 },
          );
        }

        if (body.action !== "complete") {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "Only 'complete' action is supported" },
            { status: 400 },
          );
        }

        const result = await completeGoal(parent.id, householdId, id, body.goalId);
        return NextResponse.json({ character: result });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (err.name === "NotFoundError" || err.code === "NOT_FOUND") {
          return NextResponse.json({ error: "NOT_FOUND", message: "Character not found" }, { status: 404 });
        }
        if (err.name === "ValidationError") {
          return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
        }
        if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
          return NextResponse.json({ error: "VERSION_CONFLICT", message }, { status: 409 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to complete goal" },
          { status: 500 },
        );
      }
    });
  },
  "/api/characters/{id}/goals",
);
