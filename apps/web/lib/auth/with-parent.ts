import { NextResponse } from "next/server";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

export type AuthenticatedHandler = (parent: {
  id: string;
  email: string;
  displayName: string;
}) => Promise<NextResponse>;

export async function withParent(handler: AuthenticatedHandler): Promise<NextResponse> {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());

  if (!parent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return handler(parent);
}
