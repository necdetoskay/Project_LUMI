export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      code: string;
      message: string;
    }>;
  };
  meta: {
    requestId: string;
  };
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: ApiErrorPayload["error"]["details"],
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload;
    throw new ApiClientError(
      errorPayload.error?.message ?? "İstek başarısız oldu.",
      errorPayload.error?.code ?? "UNKNOWN_ERROR",
      response.status,
      errorPayload.meta?.requestId,
      errorPayload.error?.details,
    );
  }

  return payload.data as T;
}
