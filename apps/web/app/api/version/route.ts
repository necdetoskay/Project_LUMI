import { withObservedApiRoute } from "@/lib/observability/observed-api-route";

export function GET(request: Request) {
  return withObservedApiRoute(request, () => {
    return Response.json({
      service: "lumi-web",
      version: process.env.LUMI_APP_VERSION ?? "0.1.0",
      commitSha: process.env.LUMI_GIT_COMMIT ?? "development",
      buildTime: process.env.LUMI_BUILD_TIME ?? new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV ?? "development",
    });
  });
}
