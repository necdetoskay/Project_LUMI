"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

interface DeleteProfileButtonProps {
  profileId: string;
  householdId: string;
  profileName: string;
}

export default function DeleteProfileButton({
  profileId,
  householdId,
  profileName,
}: DeleteProfileButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setError(null);
  }, [busy]);

  const archive = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/child-profiles/archive/${encodeURIComponent(profileId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setBusy(false);
    }
  }, [profileId, householdId, router]);

  const permanentDelete = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/child-profiles/${encodeURIComponent(profileId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setBusy(false);
    }
  }, [profileId, householdId, router]);

  return (
    <>
      <button
        className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-error"
        onClick={() => setOpen(true)}
        aria-label={`${profileName} sil`}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          close
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <div
            className="w-full max-w-sm rounded-[1.4rem] border border-outline-variant/50 bg-white p-6 shadow-xl"
            role="dialog"
            aria-label="Profil silme"
          >
            <h3 className="text-lg font-bold text-on-surface">
              &ldquo;{profileName}&rdquo; silinsin mi?
            </h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Bu işlem geri alınamaz. Profili arşivleyebilir veya kalıcı olarak silebilirsiniz.
            </p>

            {error ? (
              <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <button
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                onClick={archive}
                disabled={busy}
                type="button"
              >
                {busy ? "İşleniyor…" : "Arşivle (sayfadan gizle)"}
              </button>
              <button
                className="rounded-xl border border-error/30 bg-error-container/20 px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error-container/40 disabled:opacity-50"
                onClick={permanentDelete}
                disabled={busy}
                type="button"
              >
                {busy ? "İşleniyor…" : "Kalıcı olarak sil"}
              </button>
              <button
                className="rounded-xl bg-surface-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-variant/80 disabled:opacity-50"
                onClick={close}
                disabled={busy}
                ref={cancelRef}
                type="button"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
