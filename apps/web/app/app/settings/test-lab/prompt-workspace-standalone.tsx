"use client";

import { useState } from "react";

import { PromptWorkspace } from "./prompt-workspace";

export function PromptWorkspaceStandalone() {
  const [householdId, setHouseholdId] = useState("");
  const [promptKey, setPromptKey] = useState(
    "character_onboarding.character_first_identity_suggestions",
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px 64px" }}>
      <section
        style={{
          border: "1px solid rgba(127,127,127,.28)",
          borderRadius: 16,
          padding: 20,
          marginTop: 20,
        }}
      >
        <h2>Prompt Workspace Target</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <label>
            Household ID
            <input
              value={householdId}
              onChange={(event) => setHouseholdId(event.target.value)}
              style={inputStyle}
            />
          </label>
          <label>
            Prompt key
            <input
              value={promptKey}
              onChange={(event) => setPromptKey(event.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      </section>
      <PromptWorkspace householdId={householdId} promptKey={promptKey} />
    </div>
  );
}

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
