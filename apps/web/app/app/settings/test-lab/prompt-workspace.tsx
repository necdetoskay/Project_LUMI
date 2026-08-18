"use client";

import { useEffect, useMemo, useState } from "react";

type PromptVersion = {
  version: number;
  status: string;
  systemTemplate: string;
  userTemplate: string;
  allowedVariables: string[];
  requiredVariables: string[];
  outputSchema: Record<string, unknown>;
  schemaVersion: string;
  providerOverride: string | null;
  modelOverride: string | null;
  generationConfig: Record<string, unknown>;
};

type PromptWorkspaceData = {
  promptKey: string;
  activeVersion: PromptVersion | null;
  versions: PromptVersion[];
};

export function PromptWorkspace(props: {
  householdId: string;
  promptKey: string | null;
  promptVersionOverride: number | undefined;
  onPromptVersionOverrideChange: (version: number | undefined) => void;
}) {
  const [workspace, setWorkspace] = useState<PromptWorkspaceData | null>(null);
  const [sourceVersion, setSourceVersion] = useState<number | null>(null);
  const [systemTemplate, setSystemTemplate] = useState("");
  const [userTemplate, setUserTemplate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setWorkspace(null);
    setSourceVersion(null);
    setSystemTemplate("");
    setUserTemplate("");
    setMessage("");
    props.onPromptVersionOverrideChange(undefined);

    if (!props.promptKey || !props.householdId.trim()) return;

    let cancelled = false;
    const query = new URLSearchParams({
      householdId: props.householdId,
      promptKey: props.promptKey,
    });

    setBusy(true);
    fetch(`/api/settings/test-lab/prompts?${query}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message ?? "Prompt yüklenemedi");
        }
        return payload.data as PromptWorkspaceData;
      })
      .then((data) => {
        if (cancelled) return;
        setWorkspace(data);
        const source = data.activeVersion ?? data.versions[0] ?? null;
        if (source) {
          setSourceVersion(source.version);
          setSystemTemplate(source.systemTemplate);
          setUserTemplate(source.userTemplate);
        }
      })
      .catch((error) => {
        if (!cancelled) setMessage(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.householdId, props.onPromptVersionOverrideChange, props.promptKey]);

  const selectedRevision = useMemo(() => {
    if (!workspace || sourceVersion === null) return null;
    return (
      workspace.versions.find((version) => version.version === sourceVersion) ??
      null
    );
  }, [sourceVersion, workspace]);

  function chooseSource(version: number) {
    if (!workspace) return;
    const selected = workspace.versions.find(
      (candidate) => candidate.version === version,
    );
    if (!selected) return;
    setSourceVersion(version);
    setSystemTemplate(selected.systemTemplate);
    setUserTemplate(selected.userTemplate);
  }

  async function createDraft() {
    if (!workspace || sourceVersion === null) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/test-lab/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-draft",
          householdId: props.householdId,
          promptKey: props.promptKey,
          sourceVersion,
          patch: { systemTemplate, userTemplate },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Draft oluşturulamadı");
      }
      const data = payload.data.workspace as PromptWorkspaceData;
      const draft = payload.data.draft as PromptVersion;
      setWorkspace(data);
      chooseWorkspaceRevision(data, draft.version);
      props.onPromptVersionOverrideChange(draft.version);
      setMessage(
        `Draft v${draft.version} oluşturuldu. Production active prompt değişmedi; sonraki Test Lab run bu draft ile çalışacak.`,
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function mutateProduction(action: "activate-version" | "rollback") {
    if (!workspace || sourceVersion === null) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/test-lab/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          householdId: props.householdId,
          promptKey: props.promptKey,
          version: sourceVersion,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.message ?? "Prompt production işlemi başarısız",
        );
      }
      setWorkspace(payload.data.workspace as PromptWorkspaceData);
      props.onPromptVersionOverrideChange(undefined);
      setMessage(
        action === "rollback"
          ? `Production prompt v${sourceVersion} revision'ına rollback edildi.`
          : `Production active prompt v${sourceVersion} olarak değiştirildi.`,
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function chooseWorkspaceRevision(data: PromptWorkspaceData, version: number) {
    const selected = data.versions.find(
      (candidate) => candidate.version === version,
    );
    if (!selected) return;
    setSourceVersion(version);
    setSystemTemplate(selected.systemTemplate);
    setUserTemplate(selected.userTemplate);
  }

  if (!props.promptKey) {
    return (
      <section style={panelStyle}>
        <h2>3. Prompt Workspace</h2>
        <p>Bu phase LLM promptu kullanmıyor.</p>
      </section>
    );
  }

  return (
    <section style={panelStyle}>
      <h2>3. Prompt Workspace</h2>
      <p style={{ opacity: 0.75 }}>
        <code>{props.promptKey}</code> — production active revision hiçbir zaman
        yerinde overwrite edilmez. Düzenleme yeni immutable draft üretir.
      </p>

      {!props.householdId.trim() ? (
        <p>Prompt Workspace için önce Household ID girin.</p>
      ) : null}

      {workspace ? (
        <>
          <div style={gridStyle}>
            <label>
              Revision
              <select
                value={sourceVersion ?? ""}
                onChange={(event) => chooseSource(Number(event.target.value))}
                style={inputStyle}
              >
                {workspace.versions.map((version) => (
                  <option key={version.version} value={version.version}>
                    v{version.version} · {version.status}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <strong>Production active</strong>
              <p>
                {workspace.activeVersion
                  ? `v${workspace.activeVersion.version}`
                  : "Active revision yok"}
              </p>
            </div>
            <div>
              <strong>Bu Test Lab run</strong>
              <p>
                {props.promptVersionOverride === undefined
                  ? "Production active revision"
                  : `Exact revision v${props.promptVersionOverride}`}
              </p>
            </div>
          </div>

          <label style={{ display: "block", marginTop: 16 }}>
            System prompt
            <textarea
              rows={8}
              value={systemTemplate}
              onChange={(event) => setSystemTemplate(event.target.value)}
              style={{
                ...inputStyle,
                fontFamily: "monospace",
                resize: "vertical",
              }}
            />
          </label>

          <label style={{ display: "block", marginTop: 16 }}>
            User prompt
            <textarea
              rows={14}
              value={userTemplate}
              onChange={(event) => setUserTemplate(event.target.value)}
              style={{
                ...inputStyle,
                fontFamily: "monospace",
                resize: "vertical",
              }}
            />
          </label>

          {selectedRevision ? (
            <details style={{ marginTop: 12 }}>
              <summary>Variables / model / output schema</summary>
              <pre style={metaStyle}>
                {JSON.stringify(
                  {
                    allowedVariables: selectedRevision.allowedVariables,
                    requiredVariables: selectedRevision.requiredVariables,
                    providerOverride: selectedRevision.providerOverride,
                    modelOverride: selectedRevision.modelOverride,
                    generationConfig: selectedRevision.generationConfig,
                    schemaVersion: selectedRevision.schemaVersion,
                    outputSchema: selectedRevision.outputSchema,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          ) : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              disabled={busy || !systemTemplate.trim() || !userTemplate.trim()}
              onClick={createDraft}
              style={buttonStyle}
            >
              Yeni draft revision oluştur
            </button>
            <button
              disabled={busy || sourceVersion === null}
              onClick={() =>
                props.onPromptVersionOverrideChange(sourceVersion ?? undefined)
              }
              style={buttonStyle}
            >
              Bu revision ile test et
            </button>
            <button
              disabled={busy}
              onClick={() => props.onPromptVersionOverrideChange(undefined)}
              style={buttonStyle}
            >
              Active revision ile test et
            </button>
            <button
              disabled={busy || sourceVersion === null}
              onClick={() => mutateProduction("activate-version")}
              style={buttonStyle}
            >
              Production active yap
            </button>
            <button
              disabled={busy || sourceVersion === null}
              onClick={() => mutateProduction("rollback")}
              style={buttonStyle}
            >
              Bu revision&apos;a rollback
            </button>
          </div>
        </>
      ) : null}

      {busy ? <p>Prompt workspace güncelleniyor…</p> : null}
      {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}
    </section>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Beklenmeyen prompt workspace hatası";
}

const panelStyle = {
  border: "1px solid rgba(127,127,127,.28)",
  borderRadius: 16,
  padding: 20,
  marginTop: 20,
} as const;

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
} as const;

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  marginTop: 6,
  borderRadius: 8,
  border: "1px solid rgba(127,127,127,.4)",
  background: "transparent",
  color: "inherit",
} as const;

const buttonStyle = {
  marginTop: 16,
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid rgba(127,127,127,.4)",
  cursor: "pointer",
} as const;

const metaStyle = {
  padding: 12,
  borderRadius: 8,
  overflowX: "auto",
  background: "rgba(127,127,127,.08)",
  fontSize: 12,
} as const;
