"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface InspectorSection {
  section: string;
  priority: string | null;
  maxTokens: number | null;
  estimatedTokens: number | null;
  source: string | null;
  sourceVersion: string | null;
  authority: string | null;
  reason: string | null;
  updatedAt: string | null;
  compaction: {
    strategy: string | null;
    originalTokens: number | null;
    compactedTokens: number | null;
    removedItems: number | null;
  } | null;
}

interface InspectorTrace {
  id: string;
  taskType: string;
  promptKey: string;
  promptVersion: number;
  provider: string;
  modelId: string;
  validationStatus: "valid" | "invalid";
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsdMicros: number | null;
  latencyMs: number;
  createdAt: string;
  context: {
    fingerprint: string | null;
    reconstructability: "audit_only" | "unavailable";
    reconstructabilityReason:
      | "privacy_safe_trace_evidence"
      | "context_evidence_missing";
    profile: string | null;
    maxContextTokens: number | null;
    estimatedTokens: number | null;
    droppedSections: string[];
    sections: InspectorSection[];
  };
}

export function AiGenerationTracesClientPage() {
  const [traces, setTraces] = useState<InspectorTrace[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InspectorTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/context-inspector/traces?limit=50")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("AI generation traces could not be loaded");
        }
        return response.json() as Promise<{ traces: InspectorTrace[] }>;
      })
      .then((data) => {
        setTraces(data.traces);
        setSelectedTraceId(data.traces[0]?.id ?? null);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Unexpected error");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTraceId) {
      setDetail(null);
      return;
    }

    fetch(`/api/settings/context-inspector/traces/${selectedTraceId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("AI generation trace detail could not be loaded");
        }
        return response.json() as Promise<{ trace: InspectorTrace }>;
      })
      .then((data) => setDetail(data.trace))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Unexpected error");
      });
  }, [selectedTraceId]);

  const selectedTrace = useMemo(
    () => traces.find((trace) => trace.id === selectedTraceId) ?? null,
    [selectedTraceId, traces],
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          <Link href="/app/settings" className="text-violet-700">
            ← Settings
          </Link>
          <Link
            href="/app/settings/context-inspector"
            className="text-slate-600 hover:text-violet-700"
          >
            Story Context Inspector
          </Link>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
            AI Management
          </p>
          <h1 className="text-3xl font-bold text-slate-950">
            AI Generation Traces
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Review privacy-safe generation metadata, context budgets,
            provenance, compaction and reconstruction availability. Raw child
            context and model payloads are intentionally not exposed here.
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading generation traces…
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="px-2 pb-3 text-sm font-semibold text-slate-900">
              Recent generations
            </h2>
            <div className="space-y-2">
              {traces.map((trace) => (
                <button
                  key={trace.id}
                  type="button"
                  onClick={() => setSelectedTraceId(trace.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedTraceId === trace.id
                      ? "border-violet-300 bg-violet-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {trace.promptKey}
                    </span>
                    <span className="text-xs text-slate-500">
                      v{trace.promptVersion}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {trace.modelId}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{trace.validationStatus}</span>
                    <span>{new Date(trace.createdAt).toLocaleString()}</span>
                  </div>
                </button>
              ))}
              {traces.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">
                  No AI generation traces are available yet.
                </p>
              ) : null}
            </div>
          </section>

          <section className="min-w-0">
            {detail ? (
              <TraceDetail trace={detail} />
            ) : selectedTrace ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                Loading trace detail…
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                Select a generation trace to inspect it.
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function TraceDetail({ trace }: { trace: InspectorTrace }) {
  const contextUsage = trace.context.maxContextTokens
    ? Math.min(
        100,
        Math.round(
          ((trace.context.estimatedTokens ?? 0) /
            trace.context.maxContextTokens) *
            100,
        ),
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              {trace.taskType}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {trace.promptKey} · v{trace.promptVersion}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {trace.provider} · {trace.modelId}
            </p>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            {trace.context.reconstructability}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Validation" value={trace.validationStatus} />
          <Metric
            label="Total tokens"
            value={formatNumber(trace.totalTokens)}
          />
          <Metric label="Latency" value={`${trace.latencyMs} ms`} />
          <Metric
            label="Approx. cost"
            value={formatUsdMicros(trace.estimatedCostUsdMicros)}
          />
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              Context package
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">
              {trace.context.profile ?? "Legacy / unknown profile"}
            </h3>
          </div>
          {contextUsage !== null ? (
            <span className="text-sm font-semibold text-slate-700">
              {contextUsage}% of context budget
            </span>
          ) : null}
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric
            label="Estimated context"
            value={formatNumber(trace.context.estimatedTokens)}
          />
          <Metric
            label="Context budget"
            value={formatNumber(trace.context.maxContextTokens)}
          />
          <Metric
            label="Fingerprint"
            value={shortFingerprint(trace.context.fingerprint)}
          />
        </dl>

        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          Reconstruction: {trace.context.reconstructabilityReason}. Exact
          historical raw context is not inferred when persisted evidence is
          insufficient.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950">Included sections</h3>
        <div className="mt-4 space-y-3">
          {trace.context.sections.map((section) => (
            <div
              key={section.section}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {section.section}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {section.reason ?? "unknown reason"} ·{" "}
                    {section.authority ?? "unknown authority"}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-600">
                  {formatNumber(section.estimatedTokens)} /{" "}
                  {formatNumber(section.maxTokens)} tokens
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Source: {section.source ?? "unknown"}
                {section.sourceVersion ? ` · ${section.sourceVersion}` : ""}
              </p>
              {section.compaction ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Compacted with{" "}
                  {section.compaction.strategy ?? "unknown strategy"}:{" "}
                  {formatNumber(section.compaction.originalTokens)} →{" "}
                  {formatNumber(section.compaction.compactedTokens)} tokens,{" "}
                  {formatNumber(section.compaction.removedItems)} items removed.
                </p>
              ) : null}
            </div>
          ))}
          {trace.context.sections.length === 0 ? (
            <p className="text-sm text-slate-500">
              No persisted section-level audit evidence is available.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950">Dropped sections</h3>
        {trace.context.droppedSections.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {trace.context.droppedSections.map((section) => (
              <span
                key={section}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {section}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No dropped sections were recorded for this trace.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-all text-sm font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

function formatUsdMicros(value: number | null): string {
  if (value === null) return "—";
  return `$${(value / 1_000_000).toFixed(6)}`;
}

function shortFingerprint(value: string | null): string {
  if (!value) return "—";
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}
