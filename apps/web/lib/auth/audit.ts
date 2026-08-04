import { createHash } from "node:crypto";

import { createLogger, redact } from "@lumi/logger";

export type AuthAuditAction =
  | "register"
  | "login"
  | "refresh"
  | "forgot_password"
  | "reset_password";
export type AuthAuditOutcome =
  | "succeeded"
  | "failed"
  | "rate_limited"
  | "invalid_input"
  | "reused_session";

type BuildAuthAuditEventInput = {
  action: AuthAuditAction;
  outcome: AuthAuditOutcome;
  clientIp: string;
  email?: string;
  parentId?: string;
  reason?: string;
};

const logger = createLogger({ level: "info" });

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function buildAuthAuditEvent(input: BuildAuthAuditEventInput) {
  return {
    action: input.action,
    clientIpHash: hashValue(input.clientIp),
    emailHash: input.email
      ? hashValue(input.email.trim().toLowerCase())
      : undefined,
    event: "auth.audit",
    outcome: input.outcome,
    parentId: input.parentId,
    reason: input.reason,
    timestamp: new Date().toISOString(),
  };
}

export function logAuthAuditEvent(input: BuildAuthAuditEventInput) {
  logger.info("auth.audit", `${input.action}:${input.outcome}`, {
    ...(redact(buildAuthAuditEvent(input)) as Record<string, unknown>),
    clientIpHash: hashValue(input.clientIp),
    emailHash: input.email
      ? hashValue(input.email.trim().toLowerCase())
      : undefined,
  });
}
