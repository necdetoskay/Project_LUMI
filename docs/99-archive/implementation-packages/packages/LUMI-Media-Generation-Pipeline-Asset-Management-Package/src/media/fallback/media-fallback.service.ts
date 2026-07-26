import type { MediaProviderError } from "../providers/provider-error";

export type MediaModelTarget = {
  providerCode: string;
  modelCode: string;
  maxAttempts: number;
};

export async function executeWithMediaFallback<T>(
  targets: MediaModelTarget[],
  execute: (
    target: MediaModelTarget,
  ) => Promise<T>,
): Promise<{
  result: T;
  target: MediaModelTarget;
}> {
  const errors: unknown[] = [];

  for (const target of targets) {
    for (
      let attempt = 1;
      attempt <= target.maxAttempts;
      attempt += 1
    ) {
      try {
        return {
          result: await execute(target),
          target,
        };
      } catch (error) {
        errors.push(error);

        const retryable =
          typeof error === "object" &&
          error !== null &&
          "retryable" in error
            ? Boolean(
                (
                  error as MediaProviderError
                ).retryable,
              )
            : false;

        if (!retryable) break;
      }
    }
  }

  throw new AggregateError(
    errors,
    "All media providers failed",
  );
}
