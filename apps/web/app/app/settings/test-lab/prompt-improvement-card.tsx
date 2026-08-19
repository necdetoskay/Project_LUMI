"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./canonical-dashboard.module.css";

type SuggestionState =
  | { status: "loading" }
  | { status: "empty"; message: string }
  | {
      status: "ready";
      sourcePromptVersion: number;
      rubricLabel: string;
      targetCriterion: { key: string; label: string; score: number };
      recommendation: string;
      details: string[];
      preserveCriteria: string[];
    }
  | { status: "error"; message: string };

type ApplyState =
  | { status: "idle" }
  | { status: "applying" }
  | {
      status: "created";
      draftVersion: number;
      activeVersion: number | null;
      message: string;
    }
  | { status: "error"; message: string };

export function PromptImprovementCard() {
  const [suggestion, setSuggestion] = useState<SuggestionState>({
    status: "loading",
  });
  const [apply, setApply] = useState<ApplyState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/test-lab/prompt-optimization", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message ?? "Prompt önerisi yüklenemedi");
        }
        return payload.data as Record<string, unknown>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.ready !== true) {
          setSuggestion({
            status: "empty",
            message:
              typeof data.message === "string"
                ? data.message
                : "Henüz iyileştirme önerisi yok.",
          });
          return;
        }
        setSuggestion({
          status: "ready",
          sourcePromptVersion: Number(data.sourcePromptVersion),
          rubricLabel: String(data.rubricLabel),
          targetCriterion: data.targetCriterion as {
            key: string;
            label: string;
            score: number;
          },
          recommendation: String(data.recommendation),
          details: Array.isArray(data.details)
            ? data.details.map((item) => String(item))
            : [],
          preserveCriteria: Array.isArray(data.preserveCriteria)
            ? data.preserveCriteria.map((item) => String(item))
            : [],
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setSuggestion({
            status: "error",
            message: errorMessage(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createDraft() {
    if (suggestion.status !== "ready") return;
    setApply({ status: "applying" });
    try {
      const response = await fetch(
        "/api/settings/test-lab/prompt-optimization",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create-draft" }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Prompt draft oluşturulamadı");
      }
      setApply({
        status: "created",
        draftVersion: payload.data.draftVersion,
        activeVersion: payload.data.activeVersion,
        message: payload.data.message,
      });
    } catch (error) {
      setApply({ status: "error", message: errorMessage(error) });
    }
  }

  return (
    <section className={`${styles.panel} ${styles.promptPanel}`}>
      <div className={styles.panelTitle}>
        <span className={styles.panelTitleIcon}>
          <Icon name="auto_awesome" />
        </span>
        <h2>Prompt İyileştirme Önerisi</h2>
      </div>
      <span className={styles.aiBadge}>AI Önerisi</span>

      {suggestion.status === "loading" ? (
        <p>Judge bulguları analiz ediliyor…</p>
      ) : null}
      {suggestion.status === "empty" ? <p>{suggestion.message}</p> : null}
      {suggestion.status === "error" ? (
        <p>Öneri yüklenemedi: {suggestion.message}</p>
      ) : null}

      {suggestion.status === "ready" ? (
        <>
          <p>{suggestion.recommendation}</p>
          <details className={styles.promptDetails}>
            <summary>
              <span>Örnek Prompt Değişiklikleri</span>
              <Icon name="expand_more" />
            </summary>
            <div className={styles.promptDetailBody}>
              <strong>
                {suggestion.targetCriterion.label} ·{" "}
                {suggestion.targetCriterion.score}
                /100
              </strong>
              {suggestion.details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
              <small>
                Kaynak prompt: v{suggestion.sourcePromptVersion} ·{" "}
                {suggestion.rubricLabel}
              </small>
            </div>
          </details>

          <button
            className={styles.applyPromptButton}
            type="button"
            disabled={apply.status === "applying" || apply.status === "created"}
            onClick={createDraft}
          >
            <Icon
              name={apply.status === "created" ? "check" : "construction"}
            />
            {apply.status === "applying"
              ? "Draft oluşturuluyor…"
              : apply.status === "created"
                ? `Draft v${apply.draftVersion} oluşturuldu`
                : "Prompta Uygula"}
          </button>
        </>
      ) : null}

      {apply.status === "created" ? (
        <p className={styles.promptApplyMessage}>
          {apply.message} Aktivasyon ayrı bir onaydır.{" "}
          <Link href="/app/settings/test-lab/advanced">
            Advanced Prompt Workspace’i aç
          </Link>
          .
        </p>
      ) : null}
      {apply.status === "error" ? (
        <p className={styles.promptApplyError}>{apply.message}</p>
      ) : null}
    </section>
  );
}

function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true">
      {name}
    </span>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Beklenmeyen prompt iyileştirme hatası";
}
