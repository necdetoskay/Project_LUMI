import { NextResponse } from "next/server";

import { runDemoControl, type DemoControlAction } from "@/lib/demo-control";

export const runtime = "nodejs";

const ALLOWED_ACTIONS = new Set<DemoControlAction>([
  "prepare",
  "status",
  "reset",
]);

export async function POST(request: Request) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "") as DemoControlAction;

  try {
    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
    }

    const output = await runDemoControl(action);
    const url = new URL("/demo-control", request.url);
    url.searchParams.set("result", "success");
    url.searchParams.set("action", action);
    url.searchParams.set("message", output.slice(-1800));
    return NextResponse.redirect(url, 303);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "DEMO_CONTROL_FAILED";
    const url = new URL("/demo-control", request.url);
    url.searchParams.set("result", "error");
    url.searchParams.set("action", action || "unknown");
    url.searchParams.set("message", message.slice(-1800));
    return NextResponse.redirect(url, 303);
  }
}
