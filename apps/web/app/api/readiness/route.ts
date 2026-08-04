import { getReadiness } from "@/lib/readiness";
import { createLogger } from "@lumi/logger";
import {
  emitReadinessStatus,
  emitReadinessServiceStatus,
} from "@/lib/observability/metrics";
import { withObservedApiRoute } from "@/lib/observability/observed-api-route";

export const runtime = "nodejs";

const logger = createLogger();

export async function GET(request: Request) {
  return withObservedApiRoute(request, async (correlationId) => {
    const readiness = await getReadiness();

    if (readiness.status !== "ok") {
      logger.warn("readiness.degraded", "readiness check failed", {
        services: readiness.services,
        correlationId,
      });
    }

    emitReadinessStatus(readiness.status);

    for (const [service, check] of Object.entries(readiness.services)) {
      emitReadinessServiceStatus(service, check.status);
    }

    return Response.json(
      {
        status: readiness.status,
        service: readiness.service,
        checkedAt: readiness.checkedAt,
      },
      {
        status: readiness.status === "ok" ? 200 : 503,
      },
    );
  });
}
