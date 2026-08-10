import { NextResponse } from "next/server";

import { runDemoControl, type DemoControlAction } from "@/lib/demo-control";

export const runtime = "nodejs";

const ALLOWED_ACTIONS = new Set<DemoControlAction>([
  "prepare",
  "status",
  "reset",
]);

function getPublicBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "http";
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function buildRedirectUrl(
  request: Request,
  result: "success" | "error",
  action: string,
  message: string,
): URL {
  const url = new URL("/demo-control", getPublicBaseUrl(request));
  url.searchParams.set("result", result);
  url.searchParams.set("action", action);
  url.searchParams.set("message", message.slice(-1800));
  return url;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "") as DemoControlAction;

  try {
    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
    }

    const output = await runDemoControl(action);
    return NextResponse.redirect(
      buildRedirectUrl(request, "success", action, output),
      303,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "DEMO_CONTROL_FAILED";
    return NextResponse.redirect(
      buildRedirectUrl(request, "error", action || "unknown", message),
      303,
    );
  }
}
