import { NextResponse } from "next/server";

import { clearParentSessionCookie, getParentSessionCookie } from "@/lib/auth/http";
import { revokeParentSession } from "@/lib/auth/service";
import { isFormRequest, redirectWithQuery } from "@/lib/http/response";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const POST = observeHandler(async (request: Request) => {
  await revokeParentSession(await getParentSessionCookie());

  const response = isFormRequest(request)
    ? redirectWithQuery(request, "/login", { success: "signed_out" })
    : NextResponse.json({ ok: true });

  clearParentSessionCookie(response);
  return response;
});
