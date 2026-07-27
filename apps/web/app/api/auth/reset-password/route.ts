import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getClientIp, logAuthAuditEvent } from "@/lib/auth/audit";
import { resetParentPassword } from "@/lib/auth/service";
import { readRequestBody } from "@/lib/http/request-body";
import { isFormRequest, redirectWithQuery } from "@/lib/http/response";

export async function POST(request: Request) {
  const body = await readRequestBody(request);
  const clientIp = getClientIp(request);
  const token = typeof body.token === "string" ? body.token : undefined;
  const formRequest = isFormRequest(request);

  try {
    const result = await resetParentPassword(body);
    logAuthAuditEvent({
      action: "reset_password",
      clientIp,
      email: result.parent.email,
      outcome: "succeeded",
      parentId: result.parent.id,
      reason: "PASSWORD_RESET_COMPLETED",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/login", { success: "password_reset" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]?.message;
      logAuthAuditEvent({
        action: "reset_password",
        clientIp,
        outcome: "invalid_input",
        reason: firstIssue === "PASSWORD_MISMATCH" ? firstIssue : "INVALID_RESET_INPUT",
      });

      if (formRequest) {
        return redirectWithQuery(request, "/reset-password", {
          error: firstIssue === "PASSWORD_MISMATCH" ? "password_mismatch" : "invalid_reset_input",
          token,
        });
      }

      return NextResponse.json(
        {
          error: firstIssue === "PASSWORD_MISMATCH" ? "PASSWORD_MISMATCH" : "INVALID_RESET_INPUT",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_RESET_TOKEN") {
      logAuthAuditEvent({
        action: "reset_password",
        clientIp,
        outcome: "failed",
        reason: error.message,
      });

      if (formRequest) {
        return redirectWithQuery(request, "/reset-password", {
          error: "invalid_reset_token",
          token,
        });
      }

      return NextResponse.json({ error: "INVALID_RESET_TOKEN" }, { status: 401 });
    }

    logAuthAuditEvent({
      action: "reset_password",
      clientIp,
      outcome: "failed",
      reason: "PASSWORD_RESET_FAILED",
    });

    if (formRequest) {
      return redirectWithQuery(request, "/reset-password", {
        error: "password_reset_failed",
        token,
      });
    }

    return NextResponse.json({ error: "PASSWORD_RESET_FAILED" }, { status: 500 });
  }
}
