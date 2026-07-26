import { NextResponse } from "next/server";

export function apiSuccess<T>(
  data: T,
  requestId: string,
  status = 200,
) {
  return NextResponse.json(
    {
      data,
      meta: { requestId },
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}
