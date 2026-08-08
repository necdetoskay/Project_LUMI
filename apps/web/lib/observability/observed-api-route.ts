import { withCorrelation } from "@lumi/logger";
import { generateCorrelationId, isValidCorrelationId } from "@lumi/logger";

import {
  emitCorrelationInvalid,
  emitHttpRequestDuration,
  emitHttpRequestError,
  emitHttpRequestTotal,
} from "./metrics";

export const CORRELATION_HEADER = "x-correlation-id";

export type ApiRouteHandler = (
  correlationId: string,
  request: Request,
) => Promise<Response> | Response;

function getOrCreateCorrelationId(request: Request): string {
  const existing = request.headers.get(CORRELATION_HEADER);

  if (existing && isValidCorrelationId(existing)) {
    return existing;
  }

  if (existing) {
    emitCorrelationInvalid();
  }

  return generateCorrelationId();
}

function normalizePath(pathname: string): string {
  return pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "/{id}",
  );
}

export async function withObservedApiRoute(
  request: Request,
  handler: ApiRouteHandler,
  routePattern?: string,
): Promise<Response> {
  const correlationId = getOrCreateCorrelationId(request);
  const startedAt = Date.now();
  const path = routePattern ?? normalizePath(new URL(request.url).pathname);

  return withCorrelation(correlationId, async () => {
    try {
      const response = await handler(correlationId, request);

      response.headers.set(CORRELATION_HEADER, correlationId);

      const durationMs = Date.now() - startedAt;
      const status = response.status;

      emitHttpRequestTotal(request.method, path, status);
      emitHttpRequestDuration(request.method, path, durationMs);

      if (status >= 400) {
        emitHttpRequestError(request.method, path, status);
      }

      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      emitHttpRequestTotal(request.method, path, 500);
      emitHttpRequestDuration(request.method, path, durationMs);
      emitHttpRequestError(request.method, path, 500);

      throw error;
    }
  });
}

export function observeHandler<P extends unknown[] = []>(
  handler: (request: Request, ...params: P) => Promise<Response> | Response,
  routePattern?: string,
): (request: Request, ...params: P) => Promise<Response> {
  return async (request: Request, ...params: P) => {
    return withObservedApiRoute(
      request,
      () => handler(request, ...params),
      routePattern,
    );
  };
}

export function observeHandlerNoArg(
  handler: () => Promise<Response> | Response,
  routePattern: string,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    return withObservedApiRoute(request, () => handler(), routePattern);
  };
}
