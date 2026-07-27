import { NextResponse } from "next/server";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

export async function GET() {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());

  if (!parent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json({ parent });
}
