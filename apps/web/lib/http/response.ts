import { NextResponse } from "next/server";

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
  const url = new URL(pathname, request.url);

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url, 303);
}
