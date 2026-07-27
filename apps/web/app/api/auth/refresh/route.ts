import { NextResponse } from "next/server";

import { getClientIp, logAuthAuditEvent } from "@/lib/auth/audit";
import { getParentSessionCookie, setParentSessionCookie } from "@/lib/auth/http";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { refreshParentSession } from "@/lib/auth/service";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = checkAuthRateLimit("refresh", clientIp);

  if (!rateLimit.allowed) {
    logAuthAuditEvent({
      action: "refresh",
      clientIp,
      outcome: "rate_limited",
      reason: "AUTH_RATE_LIMIT",
    });

    return NextResponse.json(
      { error: "RATE_LIMITED" },
      {
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        status: 429,
      },
    );
  }

  try {
    const result = await refreshParentSession(await getParentSessionCookie());
    const response = NextResponse.json({ parent: result.parent });
    setParentSessionCookie(response, result.session);
    logAuthAuditEvent({
      action: "refresh",
      clientIp,
      email: result.parent.email,
      outcome: "succeeded",
      parentId: result.parent.id,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "REUSED_SESSION") {
      logAuthAuditEvent({
        action: "refresh",
        clientIp,
        outcome: "reused_session",
        reason: error.message,
      });
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "INVALID_SESSION") {
      logAuthAuditEvent({
        action: "refresh",
        clientIp,
        outcome: "failed",
        reason: error.message,
      });
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    logAuthAuditEvent({
      action: "refresh",
      clientIp,
      outcome: "failed",
      reason: "REFRESH_FAILED",
    });
    return NextResponse.json({ error: "REFRESH_FAILED" }, { status: 500 });
  }
}
