import { getReadiness } from "@/lib/readiness";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getReadiness();

  return Response.json(readiness, {
    status: readiness.status === "ok" ? 200 : 503,
  });
}
