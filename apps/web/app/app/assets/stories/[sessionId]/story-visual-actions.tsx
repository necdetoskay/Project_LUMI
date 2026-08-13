"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const styles = [
  ["lumi-storybook", "LUMI Storybook"],
  ["soft-3d-adventure", "Soft 3D Adventure"],
  ["paper-cut-world", "Paper Cut World"],
  ["colored-pencil-dreams", "Colored Pencil Dreams"],
  ["classic-fairytale", "Classic Fairytale"],
  ["minimal-pastel", "Minimal Pastel"],
] as const;

export function StoryVisualActions({
  sessionId,
  missingCount,
  disabled,
}: {
  sessionId: string;
  missingCount?: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"generate" | "style" | null>(null);
  const [styleId, setStyleId] =
    useState<(typeof styles)[number][0]>("lumi-storybook");
  const [message, setMessage] = useState<string | null>(null);

  async function run(
    body: Record<string, unknown>,
    kind: "generate" | "style",
  ) {
    setPending(kind);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/assets/stories/${encodeURIComponent(sessionId)}/visuals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        generated?: number;
        reused?: number;
        failed?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Görsel işlemi başarısız oldu");
      }
      if (kind === "generate") {
        setMessage(
          `${payload.generated ?? 0} üretildi, ${payload.reused ?? 0} yeniden kullanıldı${payload.failed ? `, ${payload.failed} başarısız` : ""}.`,
        );
      } else {
        setMessage("Hikâye görsel stili değiştirildi.");
      }
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İşlem başarısız oldu",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-5 space-y-3">
      <button
        className="storybook-button w-full"
        disabled={disabled || pending !== null || missingCount === 0}
        onClick={() => run({ action: "generate-missing" }, "generate")}
        type="button"
      >
        {pending === "generate"
          ? "Görseller oluşturuluyor…"
          : typeof missingCount === "number"
            ? `Eksik görselleri oluştur (${missingCount})`
            : "Eksik görselleri oluştur"}
      </button>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1">
        <select
          aria-label="Hikâye görsel stili"
          className="min-h-11 rounded-xl border border-outline-variant bg-white px-3 text-sm font-bold text-on-surface"
          disabled={disabled || pending !== null}
          onChange={(event) =>
            setStyleId(event.target.value as (typeof styles)[number][0])
          }
          value={styleId}
        >
          {styles.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="storybook-button-secondary"
          disabled={disabled || pending !== null}
          onClick={() => run({ action: "change-style", styleId }, "style")}
          type="button"
        >
          {pending === "style"
            ? "Stil değiştiriliyor…"
            : "Görsel stilini değiştir"}
        </button>
      </div>

      {message ? (
        <p className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-on-surface-variant">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function StoryVisualRegenerateButton({
  sessionId,
  requirementKey,
}: {
  sessionId: string;
  requirementKey: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="mt-3 text-xs font-extrabold text-primary hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const response = await fetch(
            `/api/assets/stories/${encodeURIComponent(sessionId)}/visuals`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "regenerate",
                requirementKey,
              }),
            },
          );
          if (!response.ok) throw new Error("REGENERATE_FAILED");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
      type="button"
    >
      {pending ? "Yeniden üretiliyor…" : "Yeniden üret"}
    </button>
  );
}
