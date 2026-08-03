import { withObservedApiRoute } from "@/lib/observability/observed-api-route";

export function GET(request: Request) {
  return withObservedApiRoute(request, () => {
    return Response.json({
      service: "lumi-web",
      status: "ok",
    });
  });
}
