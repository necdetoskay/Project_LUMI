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
  // Reverse proxies (including Vercel) terminate TLS before forwarding the
  // request. Preserve the forwarded protocol so a HTTPS form submission does
  // not get redirected to an insecure http:// URL.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const requestProtocol = new URL(request.url).protocol.replace(":", "");
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : requestProtocol;
  const host = forwardedHost ?? hostHeader;
  const baseUrl = host
    ? `${protocol}://${host}`
    : publicEnvironment.NEXT_PUBLIC_APP_URL;
  const url = new URL(pathname, baseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url, 303);
}
