import {
  generateCorrelationId,
  isValidCorrelationId,
  withCorrelation,
} from "@lumi/logger";

export const CORRELATION_HEADER = "x-correlation-id";

export function getOrCreateCorrelationId(request: Request): string {
  const existing = request.headers.get(CORRELATION_HEADER);

  if (existing && isValidCorrelationId(existing)) {
    return existing;
  }

  return generateCorrelationId();
}

export function setCorrelationResponseHeader(
  response: Response,
  correlationId: string,
): void {
  response.headers.set(CORRELATION_HEADER, correlationId);
}

export async function withRequestCorrelation<T>(
  request: Request,
  handler: (correlationId: string) => Promise<T>,
): Promise<T> {
  const correlationId = getOrCreateCorrelationId(request);
  return withCorrelation(correlationId, () => handler(correlationId));
}
