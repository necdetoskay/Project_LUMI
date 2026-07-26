"use client";

import { useState } from "react";

export default function ParentControlsPage() {
  const [approvalMode, setApprovalMode] =
    useState("high_risk_only");
  const [allowChildAccept, setAllowChildAccept] =
    useState(false);
  const [allowGifts, setAllowGifts] =
    useState(true);
  const [dailyLimit, setDailyLimit] =
    useState(5);

  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Ebeveyn alanı
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Fırsat ve görünürlük kontrolleri
        </h1>
      </div>

      <div className="rounded-2xl border bg-background p-6">
        <label className="grid gap-2">
          <span className="font-medium">
            Ebeveyn onayı
          </span>
          <select
            value={approvalMode}
            onChange={(event) =>
              setApprovalMode(event.target.value)
            }
            className="min-h-11 rounded-lg border px-3"
          >
            <option value="always">
              Her zaman onay iste
            </option>
            <option value="high_risk_only">
              Yalnızca önemli durumlarda
            </option>
            <option value="never">
              Onay isteme
            </option>
          </select>
        </label>

        <div className="mt-6 grid gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allowChildAccept}
              onChange={(event) =>
                setAllowChildAccept(
                  event.target.checked,
                )
              }
            />
            Çocuk fırsatları doğrudan kabul edebilsin
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allowGifts}
              onChange={(event) =>
                setAllowGifts(event.target.checked)
              }
            />
            NPC hediyelerine izin ver
          </label>

          <label className="grid gap-2">
            <span className="font-medium">
              Günlük gösterilecek en fazla fırsat
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={dailyLimit}
              onChange={(event) =>
                setDailyLimit(
                  Number(event.target.value),
                )
              }
              className="min-h-11 rounded-lg border px-3"
            />
          </label>
        </div>

        <button
          type="button"
          className="mt-8 min-h-11 rounded-lg bg-primary px-5 font-medium text-primary-foreground"
        >
          Ayarları kaydet
        </button>
      </div>
    </section>
  );
}
