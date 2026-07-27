import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { parentSessionCookieName } from "@/lib/auth/tokens";
import { serverEnvironment } from "@/lib/env";

type SessionCookieInput = {
  expiresAt: Date;
  token: string;
};

export async function getParentSessionCookie() {
  return (await cookies()).get(parentSessionCookieName)?.value;
}

export function setParentSessionCookie(
  response: NextResponse,
  session: SessionCookieInput,
) {
  response.cookies.set(parentSessionCookieName, session.token, {
    expires: session.expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: serverEnvironment.AUTH_COOKIE_SECURE,
  });
}

export function clearParentSessionCookie(response: NextResponse) {
  response.cookies.set(parentSessionCookieName, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: serverEnvironment.AUTH_COOKIE_SECURE,
  });
}
