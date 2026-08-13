"use client";

import { useEffect } from "react";

type DiagnosticPayload = Record<string, boolean | number | string | null>;

export function AssetsRuntimeDiagnostics({
  route,
  payload,
}: {
  route: string;
  payload: DiagnosticPayload;
}) {
  useEffect(() => {
    console.warn("[LUMI_ASSETS_DIAG]", {
      marker: "assets-runtime-diag-2026-08-13-v1",
      route,
      href: window.location.href,
      ...payload,
    });
  }, [payload, route]);

  return null;
}
