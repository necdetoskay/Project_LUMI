"use client";

import { useMemo, useState } from "react";

type PromptVersion = { version: number; status: "draft" | "active" | "archived" };
type Preview = { system: string; user: string; usedVariables: string[]; missingRequiredVariables: string[]; unknownTemplateVariables: string[] };

export default function PromptPlayground({ promptKey, versions, selectedVersion }: { promptKey: string; versions: PromptVersion[]; selectedVersion: number }) {
  const active = useMemo(() => versions.find((item) => item.status === "active") ?? null, [versions]);
  const [contextText, setContextText] = useState("{}\n");
  const [results, setResults] = useState<{ active?: Preview; candidate?: Preview }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function preview(version: number, context: Record<string, unknown>) {
    const response = await fetch("/api/settings/prompts/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ promptKey, version, context }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? "Preview oluşturulamadı");
    return payload.data as Preview;
  }

  async function run() {
    setBusy(true); setError(null);
    try {
      const parsed = JSON.parse(contextText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Context bir JSON object olmalı.");
      const context = parsed as Record<string, unknown>;
      const [activeResult, candidateResult] = await Promise.all([
        active ? preview(active.version, context) : Promise.resolve(undefined),
        preview(selectedVersion, context),
      ]);
      setResults({ active: activeResult, candidate: candidateResult });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Playground çalıştırılamadı");
    } finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-slate-900">Prompt Playground</h3><p className="text-sm text-slate-600">Aynı context ile production active ve seçili sürümün render sonucunu karşılaştırın.</p></div><button type="button" disabled={busy} onClick={() => void run()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Hazırlanıyor…" : "Preview çalıştır"}</button></div>
      <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Context JSON</span><textarea value={contextText} onChange={(event) => setContextText(event.target.value)} rows={9} spellCheck={false} className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs leading-5" /></label>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
    {(results.active || results.candidate) ? <div className="grid gap-4 xl:grid-cols-2">
      <PreviewCard title={active ? `Production · v${active.version}` : "Production · active yok"} preview={results.active} />
      <PreviewCard title={`Seçili · v${selectedVersion}`} preview={results.candidate} />
    </div> : null}
  </div>;
}

function PreviewCard({ title, preview }: { title: string; preview?: Preview }) {
  return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"><h4 className="mb-3 font-semibold text-slate-900">{title}</h4>{preview ? <div className="space-y-3">
    {(preview.missingRequiredVariables.length || preview.unknownTemplateVariables.length) ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{preview.missingRequiredVariables.length ? <p>Eksik required: {preview.missingRequiredVariables.join(", ")}</p> : null}{preview.unknownTemplateVariables.length ? <p>İzinsiz template variable: {preview.unknownTemplateVariables.join(", ")}</p> : null}</div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">Variable kontrolü geçti.</div>}
    <Rendered label="System" value={preview.system} /><Rendered label="User" value={preview.user} />
    <p className="break-words text-xs text-slate-500">Kullanılan değişkenler: {preview.usedVariables.join(", ") || "yok"}</p>
  </div> : <p className="text-sm text-slate-500">Sonuç yok.</p>}</div>;
}
function Rendered({ label, value }: { label: string; value: string }) { return <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-800">{value}</pre></div>; }
