import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { generateCorrelationId, isValidCorrelationId } from "@lumi/logger";

import { emitCorrelationInvalid } from "@/lib/observability/metrics";

export const CORRELATION_HEADER = "x-correlation-id";

export function proxy(request: NextRequest) {
  const existing = request.headers.get(CORRELATION_HEADER);
  let correlationId: string;

  if (existing && isValidCorrelationId(existing)) {
    correlationId = existing;
  } else {
    if (existing) {
      emitCorrelationInvalid();
    }

    correlationId = generateCorrelationId();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_HEADER, correlationId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(CORRELATION_HEADER, correlationId);

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
