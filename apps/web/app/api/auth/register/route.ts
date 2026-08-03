import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getClientIp, logAuthAuditEvent } from "@/lib/auth/audit";
import { setParentSessionCookie } from "@/lib/auth/http";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { registerParent } from "@/lib/auth/service";
import { readRequestBody } from "@/lib/http/request-body";
import { isFormRequest, redirectWithQuery } from "@/lib/http/response";
import { observeHandler } from "@/lib/observability/observed-api-route";

function getRateLimitIdentifier(request: Request, email: unknown) {
  const clientIp = getClientIp(request);
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "unknown";
  return `${clientIp}:${normalizedEmail}`;
}

export const POST = observeHandler(async (request: Request) => {
  const body = await readRequestBody(request);
  const clientIp = getClientIp(request);
  const email = typeof body.email === "string" ? body.email : undefined;
  const formRequest = isFormRequest(request);
  const rateLimit = checkAuthRateLimit("register", getRateLimitIdentifier(request, email));

  if (!rateLimit.allowed) {
    logAuthAuditEvent({
      action: "register",
      clientIp,
      email,
      outcome: "rate_limited",
      reason: "AUTH_RATE_LIMIT",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/register", {
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
    const result = await registerParent(body);
    const response = formRequest
      ? redirectWithQuery(request, "/app", { success: "account_created" })
      : NextResponse.json({ parent: result.parent }, { status: 201 });

    setParentSessionCookie(response, result.session);
    logAuthAuditEvent({
      action: "register",
      clientIp,
      email: result.parent.email,
      outcome: "succeeded",
      parentId: result.parent.id,
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]?.message;
      logAuthAuditEvent({
        action: "register",
        clientIp,
        email,
        outcome: "invalid_input",
        reason: firstIssue === "PASSWORD_MISMATCH" ? firstIssue : "INVALID_REGISTER_INPUT",
      });

      if (formRequest) {
        return redirectWithQuery(request, "/register", {
          email,
          error: firstIssue === "PASSWORD_MISMATCH" ? "password_mismatch" : "invalid_register_input",
        });
      }

      return NextResponse.json(
        {
          error: firstIssue === "PASSWORD_MISMATCH" ? "PASSWORD_MISMATCH" : "INVALID_REGISTER_INPUT",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "PARENT_EMAIL_ALREADY_EXISTS") {
      logAuthAuditEvent({
        action: "register",
        clientIp,
        email,
        outcome: "failed",
        reason: error.message,
      });

      if (formRequest) {
        return redirectWithQuery(request, "/register", {
          email,
          error: "email_exists",
        });
      }

      return NextResponse.json({ error: "PARENT_EMAIL_ALREADY_EXISTS" }, { status: 409 });
    }

    logAuthAuditEvent({
      action: "register",
      clientIp,
      email,
      outcome: "failed",
      reason: "REGISTER_FAILED",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/register", {
        email,
        error: "register_failed",
      });
    }

    return NextResponse.json({ error: "REGISTER_FAILED" }, { status: 500 });
  }
});
