import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getClientIp, logAuthAuditEvent } from "@/lib/auth/audit";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { requestPasswordReset } from "@/lib/auth/service";
import { readRequestBody } from "@/lib/http/request-body";
import { isFormRequest, redirectWithQuery } from "@/lib/http/response";

function getRateLimitIdentifier(request: Request, email: unknown) {
  const clientIp = getClientIp(request);
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "unknown";
  return `${clientIp}:${normalizedEmail}`;
}

export async function POST(request: Request) {
  const body = await readRequestBody(request);
  const clientIp = getClientIp(request);
  const email = typeof body.email === "string" ? body.email : undefined;
  const formRequest = isFormRequest(request);
  const rateLimit = checkAuthRateLimit(
    "forgot_password",
    getRateLimitIdentifier(request, email),
  );

  if (!rateLimit.allowed) {
    logAuthAuditEvent({
      action: "forgot_password",
      clientIp,
      email,
      outcome: "rate_limited",
      reason: "PASSWORD_RESET_RATE_LIMIT",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/forgot-password", {
        email,
        error: "rate_limited",
      });
    }

    return NextResponse.json(
      { error: "RATE_LIMITED" },
      {
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        status: 429,
      },
    );
  }

  try {
    const result = await requestPasswordReset(body);
    logAuthAuditEvent({
      action: "forgot_password",
      clientIp,
      email: result.email,
      outcome: "succeeded",
      reason: "PASSWORD_RESET_REQUESTED",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/forgot-password", {
        email: result.email,
        previewToken: result.previewToken ?? undefined,
        success: "reset_requested",
      });
    }

    return NextResponse.json({ ok: true, previewToken: result.previewToken });
  } catch (error) {
    if (error instanceof ZodError) {
      logAuthAuditEvent({
        action: "forgot_password",
        clientIp,
        email,
        outcome: "invalid_input",
        reason: "INVALID_RESET_REQUEST",
      });

      if (formRequest) {
        return redirectWithQuery(request, "/forgot-password", {
          email,
          error: "invalid_email",
        });
      }

      return NextResponse.json({ error: "INVALID_RESET_REQUEST" }, { status: 400 });
    }

    logAuthAuditEvent({
      action: "forgot_password",
      clientIp,
      email,
      outcome: "failed",
      reason: "PASSWORD_RESET_REQUEST_FAILED",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/forgot-password", {
        email,
        error: "request_failed",
      });
    }

    return NextResponse.json({ error: "PASSWORD_RESET_REQUEST_FAILED" }, { status: 500 });
  }
}
