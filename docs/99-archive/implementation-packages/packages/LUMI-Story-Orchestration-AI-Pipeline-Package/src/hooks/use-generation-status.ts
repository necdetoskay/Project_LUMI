"use client";

import { useEffect, useState } from "react";
import {
  apiRequest,
  ApiClientError,
} from "@/lib/api/client";

export type GenerationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export function useGenerationStatus(
  requestId: string,
) {
  const [status, setStatus] =
    useState<GenerationStatus>("pending");
  const [output, setOutput] =
    useState<Record<string, unknown>>();
  const [error, setError] =
    useState<string>();

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result =
          await apiRequest<{
            status: GenerationStatus;
            outputPayload?: Record<
              string,
              unknown
            >;
          }>(
            `/api/v1/generation-requests/${requestId}`,
          );

        if (!active) return;

        setStatus(result.status);
        setOutput(result.outputPayload);

        if (
          result.status === "pending" ||
          result.status === "running"
        ) {
          timer = setTimeout(poll, 2000);
        }
      } catch (error) {
        if (!active) return;
        setError(
          (error as ApiClientError).message,
        );
      }
    }

    poll();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [requestId]);

  return {
    status,
    output,
    error,
  };
}
