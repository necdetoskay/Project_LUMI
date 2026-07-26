import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRequestId } from "./api/http/request-id";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId =
    request.headers.get("x-request-id") ??
    createRequestId();

  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  response.headers.set(
    "x-content-type-options",
    "nosniff",
  );
  response.headers.set(
    "referrer-policy",
    "strict-origin-when-cross-origin",
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
