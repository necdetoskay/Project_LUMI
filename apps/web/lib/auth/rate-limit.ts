import { serverEnvironment } from "@/lib/env";

export type AuthRateLimitAction =
  | "register"
  | "login"
  | "refresh"
  | "forgot_password"
  | "reset_password";

type AuthRateLimitRecord = {
  count: number;
  resetAt: number;
};

type AuthRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const store = new Map<string, AuthRateLimitRecord>();

function getKey(action: AuthRateLimitAction, identifier: string) {
  return `${action}:${identifier}`;
}

export function checkAuthRateLimit(
  action: AuthRateLimitAction,
  identifier: string,
  now = Date.now(),
): AuthRateLimitResult {
  const windowMs = serverEnvironment.AUTH_RATE_LIMIT_WINDOW_MS;
  const maxRequests = serverEnvironment.AUTH_RATE_LIMIT_MAX_REQUESTS;
  const key = getKey(action, identifier);
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function resetAuthRateLimitStore() {
  store.clear();
}
