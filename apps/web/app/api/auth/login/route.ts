import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getClientIp, logAuthAuditEvent } from "@/lib/auth/audit";
import { setParentSessionCookie } from "@/lib/auth/http";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { loginParent } from "@/lib/auth/service";
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
  const rateLimit = checkAuthRateLimit("login", getRateLimitIdentifier(request, email));

  if (!rateLimit.allowed) {
    logAuthAuditEvent({
      action: "login",
      clientIp,
      email,
      outcome: "rate_limited",
      reason: "AUTH_RATE_LIMIT",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/login", {
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
    const result = await loginParent(body);
    const response = formRequest
      ? redirectWithQuery(request, "/app", { success: "signed_in" })
      : NextResponse.json({ parent: result.parent });

    setParentSessionCookie(response, result.session);
    logAuthAuditEvent({
      action: "login",
      clientIp,
      email: result.parent.email,
      outcome: "succeeded",
      parentId: result.parent.id,
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      logAuthAuditEvent({
        action: "login",
        clientIp,
        email,
        outcome: "invalid_input",
        reason: "INVALID_LOGIN_INPUT",
      });

      if (formRequest) {
        return redirectWithQuery(request, "/login", {
          email,
          error: "invalid_login_input",
        });
      }

      return NextResponse.json({ error: "INVALID_LOGIN_INPUT" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      logAuthAuditEvent({
        action: "login",
        clientIp,
        email,
        outcome: "failed",
        reason: error.message,
      });

      if (formRequest) {
        return redirectWithQuery(request, "/login", {
          email,
          error: "invalid_credentials",
        });
      }

      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    logAuthAuditEvent({
      action: "login",
      clientIp,
      email,
      outcome: "failed",
      reason: "LOGIN_FAILED",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/login", {
        email,
        error: "login_failed",
      });
    }

    return NextResponse.json({ error: "LOGIN_FAILED" }, { status: 500 });
  }
}
