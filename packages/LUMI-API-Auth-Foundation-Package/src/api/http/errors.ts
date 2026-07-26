import { ZodError } from "zod";
import { NextResponse } from "next/server";

type ApiKnownError = Error & {
  code?: string;
  status?: number;
};

export function apiErrorResponse(
  error: unknown,
  requestId: string,
) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "İstek doğrulanamadı.",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        },
        meta: { requestId },
      },
      {
        status: 422,
        headers: { "x-request-id": requestId },
      },
    );
  }

  const known = error as ApiKnownError;
  const status = known.status ?? 500;
  const code = known.code ?? "INTERNAL_ERROR";

  return NextResponse.json(
    {
      error: {
        code,
        message:
          status >= 500
            ? "Beklenmeyen bir hata oluştu."
            : known.message,
      },
      meta: { requestId },
    },
    {
      status,
      headers: { "x-request-id": requestId },
    },
  );
}
