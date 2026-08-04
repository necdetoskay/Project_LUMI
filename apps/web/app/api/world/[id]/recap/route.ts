import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { getWorldOrForbidden } from "@lumi/world";
import { getSimulationDb, DrizzleSimulationRepository, SimulationStoreAdapter } from "@lumi/simulation/db";
import { RecapService } from "@lumi/simulation/application";

const querySchema = z.object({
  since: z.string().datetime().optional(),
});

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }

    const worldId = url.pathname.split("/").pop() ?? "";
    await getWorldOrForbidden(worldId, parent.id);

    const db = getSimulationDb();
    const repo = new DrizzleSimulationRepository(db);
    const store = new SimulationStoreAdapter(repo);
    const recapService = new RecapService(store);

    const since = parsed.data.since ? new Date(parsed.data.since) : undefined;
    const recap = await recapService.buildRecap(worldId, parent.id, since);

    return NextResponse.json({ recap }, { status: 200 });
  });
}, "/api/world/[id]/recap");
