"use client";

import { useEffect, useState } from "react";

type PromptVersion = {
  id: string;
  versionNumber: number;
  status: string;
  templateBody: string;
  variableSchema: unknown;
  modelPreferences: unknown;
  outputSchema: unknown;
};

type PromptWorkspaceData = {
  registry: { id: string; promptKey: string; purpose: string };
  activeVersion: PromptVersion | null;
  versions: PromptVersion[];
};

export function PromptWorkspace(props: {
  householdId: string;
  promptKey: string | null;
}) {
  const [workspace, setWorkspace] = useState<PromptWorkspaceData | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setWorkspace(null);
    setDraftBody("");
    setMessage("");
  }, [props.householdId, props.promptKey]);

  if (!props.promptKey) {
    return (
      <section style={panelStyle}>
        <h2>3. Prompt Workspace</h2>
        <p>Bu phase LLM promptu kullanmıyor.</p>
      </section>
    );
  }

  async function loadWorkspace() {
    if (!props.householdId.trim()) {
      setMessage("Prompt workspace için Household ID gerekli.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const query = new URLSearchParams({
        householdId: props.householdId,
        promptKey: props.promptKey!,
      });
      const response = await fetch(`/api/settings/test-lab/prompts?${query}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Prompt yüklenemedi");
      setWorkspace(payload.data);
      setDraftBody(payload.data.activeVersion?.templateBody ?? "");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function createDraft() {
    if (!workspace) return;
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
          templateBody: draftBody,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Draft oluşturulamadı");
      setWorkspace(payload.data.workspace);
      setMessage(
        `Draft v${payload.data.draft.versionNumber} oluşturuldu. Active production prompt değişmedi.`,
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={panelStyle}>
      <h2>3. Prompt Workspace</h2>
      <p style={{ opacity: 0.75 }}>
        <code>{props.promptKey}</code> — active revision yerinde değiştirilemez;
        düzenleme yeni draft revision üretir.
      </p>
      <button disabled={busy} onClick={loadWorkspace} style={buttonStyle}>
        Active prompt ve revision geçmişini yükle
      </button>

      {workspace ? (
        <>
          <div style={gridStyle}>
            <div>
              <strong>Active</strong>
              <p>
                {workspace.activeVersion
                  ? `v${workspace.activeVersion.versionNumber} · ${workspace.activeVersion.status}`
                  : "Active revision yok"}
              </p>
            </div>
            <div>
              <strong>Revision history</strong>
              <p>
                {workspace.versions
                  .map((version) => `v${version.versionNumber}:${version.status}`)
                  .join(" · ") || "Revision yok"}
              </p>
            </div>
          </div>

          <label style={{ display: "block", marginTop: 16 }}>
            Draft template
            <textarea
              rows={14}
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              style={{ ...inputStyle, fontFamily: "monospace", resize: "vertical" }}
            />
          </label>

          {workspace.activeVersion ? (
            <details style={{ marginTop: 12 }}>
              <summary>Allowed variables / model / output schema</summary>
              <pre style={metaStyle}>
                {JSON.stringify(
                  {
                    variableSchema: workspace.activeVersion.variableSchema,
                    modelPreferences: workspace.activeVersion.modelPreferences,
                    outputSchema: workspace.activeVersion.outputSchema,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          ) : null}

          <button
            disabled={busy || !draftBody.trim()}
            onClick={createDraft}
            style={buttonStyle}
          >
            Yeni draft revision oluştur
          </button>
        </>
      ) : null}

      {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}
    </section>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Beklenmeyen prompt workspace hatası";
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
