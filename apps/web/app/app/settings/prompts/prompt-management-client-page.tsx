"use client";

import { useEffect, useMemo, useState } from "react";

const PROMPTS = [
  {
    key: "character_onboarding.world_character_suggestions",
    label: "Dünya karakter önerileri",
  },
] as const;

type PromptVersion = {
  version: number;
  status: "draft" | "active" | "archived";
  systemTemplate: string;
  userTemplate: string;
  allowedVariables: string[];
  requiredVariables: string[];
  outputSchema: Record<string, unknown>;
  providerOverride: string | null;
  modelOverride: string | null;
  generationConfig: Record<string, unknown>;
};

export default function PromptManagementClientPage() {
  const [promptKey, setPromptKey] = useState<string>(PROMPTS[0].key);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadVersions(key = promptKey) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/settings/prompts?promptKey=${encodeURIComponent(key)}`,
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Promptlar yüklenemedi");
      const next = (payload.data ?? []) as PromptVersion[];
      setVersions(next);
      setSelectedVersion(
        next.find((item) => item.status === "active")?.version ??
          next.at(-1)?.version ??
          null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Promptlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVersions(promptKey);
  }, [promptKey]);

  const selected = useMemo(
    () => versions.find((item) => item.version === selectedVersion) ?? null,
    [versions, selectedVersion],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-sm font-medium text-violet-700">Settings / AI</p>
        <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
          Onboarding AI Yönetimi
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Production promptlarını versiyonlayın, aktif sürümü görün ve değişiklikleri
          production'a almadan önce hazırlayın.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Onboarding adımları
          </p>
          {PROMPTS.map((prompt) => (
            <button
              key={prompt.key}
              type="button"
              onClick={() => setPromptKey(prompt.key)}
              className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${
                promptKey === prompt.key
                  ? "bg-violet-50 font-semibold text-violet-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="block">{prompt.label}</span>
              <span className="mt-1 block break-all text-xs font-normal text-slate-500">
                {prompt.key}
              </span>
            </button>
          ))}
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {loading ? <p className="text-sm text-slate-500">Yükleniyor…</p> : null}
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {!loading && !error && versions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <h2 className="font-semibold text-slate-900">Henüz prompt sürümü yok</h2>
              <p className="mt-1 text-sm text-slate-600">
                Bu prompt key için ilk draft oluşturulduğunda burada görünecek.
              </p>
            </div>
          ) : null}

          {selected ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">
                      Version {selected.version}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {selected.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{promptKey}</p>
                </div>
                <select
                  value={selectedVersion ?? ""}
                  onChange={(event) => setSelectedVersion(Number(event.target.value))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {versions.map((item) => (
                    <option key={item.version} value={item.version}>
                      v{item.version} · {item.status}
                    </option>
                  ))}
                </select>
              </div>

              <PromptField title="System template" value={selected.systemTemplate} />
              <PromptField title="User template" value={selected.userTemplate} />

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard title="İzin verilen değişkenler">
                  <div className="flex flex-wrap gap-2">
                    {selected.allowedVariables.map((variable) => (
                      <code key={variable} className="rounded-md bg-slate-100 px-2 py-1 text-xs">
                        {`{{${variable}}}`}
                      </code>
                    ))}
                  </div>
                </InfoCard>
                <InfoCard title="Model / Provider">
                  <p className="text-sm text-slate-700">
                    {selected.providerOverride ?? "Default provider"} · {selected.modelOverride ?? "Default model"}
                  </p>
                </InfoCard>
              </div>

              <InfoCard title="Output JSON Schema">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-700">
                  {JSON.stringify(selected.outputSchema, null, 2)}
                </pre>
              </InfoCard>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function PromptField({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-800">{title}</p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
        {value}
      </pre>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">{title}</p>
      {children}
    </div>
  );
}
