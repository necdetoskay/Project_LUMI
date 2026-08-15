"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type InspectionSession = {
  storySessionId: string;
  storyTitle: string;
  childProfileId: string;
  worldId: string;
  sessionStatus: string;
  inspectionCount: number;
  latestInspectionAt: string;
  latestModelId: string;
};

type InspectionListItem = {
  inspectionId: string;
  storySessionId: string;
  generatedSceneId: string;
  modelId: string;
  attempt: number;
  contextContentHash: string;
  schemaVersion: number;
  createdAt: string;
  tokenUsage: { used: number; budget: number };
  summary: Record<string, number>;
  sections: Array<{
    name: string;
    priority: number;
    tokensUsed: number;
    truncated: boolean;
    itemCount: number;
  }>;
};

type InspectionDetail = InspectionListItem & {
  request: Record<string, unknown>;
  findings: Array<Record<string, unknown>>;
  sections: Array<{
    name: string;
    priority: number;
    tokensUsed: number;
    truncated: boolean;
    itemCount: number;
    items?: Array<Record<string, unknown>>;
  }>;
};

export function ContextInspectorClientPage({
  householdId,
}: {
  householdId: string;
}) {
  const [sessions, setSessions] = useState<InspectionSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InspectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/settings/context-inspector/sessions?householdId=${householdId}`)
      .then((response) => {
        if (!response.ok) throw new Error("Generation sessions could not be loaded");
        return response.json();
      })
      .then((data: { sessions: InspectionSession[] }) => {
        setSessions(data.sessions);
        setSelectedSessionId(data.sessions[0]?.storySessionId ?? null);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unexpected error"),
      );
  }, [householdId]);

  useEffect(() => {
    if (!selectedSessionId) return;
    setDetail(null);
    fetch(
      `/api/settings/context-inspector/sessions/${selectedSessionId}?householdId=${householdId}`,
    )
      .then((response) => {
        if (!response.ok) throw new Error("Generation history could not be loaded");
        return response.json();
      })
      .then((data: { inspections: InspectionListItem[] }) => {
        setInspections(data.inspections);
        setSelectedSceneId(data.inspections.at(-1)?.generatedSceneId ?? null);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unexpected error"),
      );
  }, [householdId, selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId || !selectedSceneId) return;
    fetch(
      `/api/settings/context-inspector/sessions/${selectedSessionId}/scenes/${selectedSceneId}?householdId=${householdId}`,
    )
      .then((response) => {
        if (!response.ok) throw new Error("Inspection detail could not be loaded");
        return response.json();
      })
      .then((data: { inspection: InspectionDetail }) => setDetail(data.inspection))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unexpected error"),
      );
  }, [householdId, selectedSceneId, selectedSessionId]);

  const selectedSession = useMemo(
    () => sessions.find((item) => item.storySessionId === selectedSessionId),
    [selectedSessionId, sessions],
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <Link href="/app/settings" className="text-sm font-medium text-violet-700">
          ← Settings
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
            AI Management
          </p>
          <h1 className="text-3xl font-bold text-slate-950">Context Inspector</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Inspect what context was selected for a generation, how the token budget
            was used, and which findings affected the final model context.
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[280px_320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <h2 className="px-2 pb-3 text-sm font-semibold text-slate-900">Story sessions</h2>
          <div className="space-y-2">
            {sessions.map((item) => (
              <button
                key={item.storySessionId}
                type="button"
                onClick={() => setSelectedSessionId(item.storySessionId)}
                className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                  selectedSessionId === item.storySessionId
                    ? "border-violet-300 bg-violet-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-slate-900">{item.storyTitle}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.inspectionCount} generations · {item.sessionStatus}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {item.latestModelId}
                </span>
              </button>
            ))}
            {sessions.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">No inspected generations yet.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="px-2 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Generation history</h2>
            {selectedSession ? (
              <p className="mt-1 truncate text-xs text-slate-500">{selectedSession.storyTitle}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            {inspections.map((item) => (
              <button
                key={item.inspectionId}
                type="button"
                onClick={() => setSelectedSceneId(item.generatedSceneId)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedSceneId === item.generatedSceneId
                    ? "border-violet-300 bg-violet-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-800">Attempt {item.attempt}</span>
                  <span className="text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 truncate text-xs text-slate-500">{item.modelId}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.tokenUsage.used} / {item.tokenUsage.budget} tokens
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="min-w-0 space-y-4">
          {detail ? <InspectionDetailView detail={detail} /> : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Select a generation to inspect its context.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InspectionDetailView({ detail }: { detail: InspectionDetail }) {
  const percentage = detail.tokenUsage.budget
    ? Math.min(100, Math.round((detail.tokenUsage.used / detail.tokenUsage.budget) * 100))
    : 0;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Overview</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{detail.modelId}</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            schema v{detail.schemaVersion}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Attempt" value={String(detail.attempt)} />
          <Info label="Findings" value={String(detail.findings.length)} />
          <Info label="Sections" value={String(detail.sections.length)} />
          <Info label="Context hash" value={detail.contextContentHash.slice(0, 16)} />
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">Token budget</h2>
          <span className="text-sm font-medium text-slate-600">{percentage}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-violet-600" style={{ width: `${percentage}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {detail.tokenUsage.used} used of {detail.tokenUsage.budget} available tokens
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Context sections</h2>
        {detail.sections.map((section) => (
          <details key={section.name} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-slate-900">{section.name}</span>
                  <p className="mt-1 text-xs text-slate-500">
                    {section.itemCount} items · priority {section.priority}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>{section.tokensUsed} tokens</div>
                  {section.truncated ? <div className="font-semibold text-amber-700">Truncated</div> : null}
                </div>
              </div>
            </summary>
            {section.items?.length ? (
              <div className="space-y-2 border-t border-slate-100 p-4">
                {section.items.map((item, index) => (
                  <pre key={index} className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                ))}
              </div>
            ) : null}
          </details>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">Findings</h2>
        {detail.findings.length ? (
          <div className="mt-3 space-y-2">
            {detail.findings.map((finding, index) => (
              <pre key={index} className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(finding, null, 2)}
              </pre>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No findings were recorded.</p>
        )}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
