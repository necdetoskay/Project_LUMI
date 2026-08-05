import { NextResponse } from "next/server";

import { publicEnvironment } from "@/lib/env";

export function isFormRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

export function redirectWithQuery(
  request: Request,
  pathname: string,
  query: Record<string, string | undefined>,
) {
  // Next standalone servers run with HOSTNAME=0.0.0.0, which makes
  // request.url resolve to 0.0.0.0 instead of the real public origin.
  // Prefer the request Host header so redirects land on the address the
  // browser actually used, falling back to the configured public app URL.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const baseUrl = forwardedHost
    ? `http://${forwardedHost}`
    : hostHeader
      ? `http://${hostHeader}`
      : publicEnvironment.NEXT_PUBLIC_APP_URL;
  const url = new URL(pathname, baseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url, 303);
}
