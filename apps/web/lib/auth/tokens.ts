import { createHash, randomBytes } from "node:crypto";

export const parentSessionCookieName = "lumi_parent_session";

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiry(days = 30) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export function getPasswordResetExpiry(hours = 1) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt;
}
