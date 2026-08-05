"use client";

import { useCallback, useEffect, useState } from "react";

interface ParentPolicy {
  householdId: string;
  maxDailyStories: number;
  contentBoundary: "strict" | "moderate" | "open";
  timeLimitMinutes: number | null;
  requireParentApprovalForAi: boolean;
  allowImageGeneration: boolean;
  allowTts: boolean;
  blockedTopics: string[];
  customNotes: string[];
}

interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: string;
}

const BOUNDARY_OPTIONS: Array<{
  value: ParentPolicy["contentBoundary"];
  label: string;
  description: string;
}> = [
  {
    value: "strict",
    label: "Katı",
    description: "En güvenli içerik sınırı, hassas temalar kapalı",
  },
  {
    value: "moderate",
    label: "Orta",
    description: "Dengeli içerik, yaşa uygun temalara izin verir",
  },
  {
    value: "open",
    label: "Açık",
    description: "Daha geniş temalar, ebeveyn gözetiminde",
  },
];

export default function SafetySettingsClientPage() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [maxDailyStories, setMaxDailyStories] = useState(3);
  const [contentBoundary, setContentBoundary] =
    useState<ParentPolicy["contentBoundary"]>("strict");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>("");
  const [requireParentApprovalForAi, setRequireParentApprovalForAi] =
    useState(false);
  const [allowImageGeneration, setAllowImageGeneration] = useState(true);
  const [allowTts, setAllowTts] = useState(true);
  const [blockedTopicsInput, setBlockedTopicsInput] = useState("");
  const [customNotesInput, setCustomNotesInput] = useState("");

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        const hId = data.onboarding?.householdId;
        if (!hId) {
          setStatusMessage({
            type: "error",
            text: "Aile evreni bulunamadı. Önce kurulumu tamamlayın.",
          });
          setLoading(false);
          return;
        }
        setHouseholdId(hId);
        return Promise.all([
          fetch(`/api/parent-policy?householdId=${encodeURIComponent(hId)}`)
            .then((r) => r.json())
            .catch(() => null),
          fetch(
            `/api/parent-policy/audit?householdId=${encodeURIComponent(hId)}`,
          )
            .then((r) => r.json())
            .catch(() => null),
        ]);
      })
      .then((results) => {
        if (results) {
          const [policyData, auditData] = results;
          if (policyData?.policy) {
            applyPolicy(policyData.policy);
          }
          if (auditData?.entries) {
            setAudit(auditData.entries);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setStatusMessage({
          type: "error",
          text: "Güvenlik ayarları yüklenemedi.",
        });
        setLoading(false);
      });
  }, []);

  const applyPolicy = useCallback((p: ParentPolicy) => {
    setMaxDailyStories(p.maxDailyStories);
    setContentBoundary(p.contentBoundary);
    setTimeLimitMinutes(
      p.timeLimitMinutes === null ? "" : String(p.timeLimitMinutes),
    );
    setRequireParentApprovalForAi(p.requireParentApprovalForAi);
    setAllowImageGeneration(p.allowImageGeneration);
    setAllowTts(p.allowTts);
    setBlockedTopicsInput((p.blockedTopics ?? []).join(", "));
    setCustomNotesInput((p.customNotes ?? []).join("\n"));
  }, []);

  const showStatus = useCallback((type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  }, []);

  const refreshAudit = useCallback(async (hId: string) => {
    setLoadingAudit(true);
    try {
      const res = await fetch(
        `/api/parent-policy/audit?householdId=${encodeURIComponent(hId)}`,
      );
      const data = await res.json();
      if (data.entries) setAudit(data.entries);
    } catch {
      // audit refresh failure is non-fatal
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  const refreshPolicy = useCallback(
    async (hId: string) => {
      const res = await fetch(
        `/api/parent-policy?householdId=${encodeURIComponent(hId)}`,
      );
      const data = await res.json();
      if (data.policy) applyPolicy(data.policy);
    },
    [applyPolicy],
  );

  const handleSave = useCallback(async () => {
    if (!householdId) {
      showStatus("error", "Aile evreni bulunamadı.");
      return;
    }
    setSaving(true);
    try {
      const blockedTopics = blockedTopicsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const customNotes = customNotesInput
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
      const timeLimit =
        timeLimitMinutes.trim() === ""
          ? null
          : Math.max(1, parseInt(timeLimitMinutes, 10) || 0);

      const res = await fetch("/api/parent-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          maxDailyStories,
          contentBoundary,
          timeLimitMinutes: timeLimit,
          requireParentApprovalForAi,
          allowImageGeneration,
          allowTts,
          blockedTopics,
          customNotes,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        applyPolicy(json.policy);
        await refreshPolicy(householdId);
        await refreshAudit(householdId);
        showStatus("success", "Ebeveyn güvenlik politikası güncellendi.");
      } else {
        showStatus("error", json.message ?? "Güncelleme başarısız.");
      }
    } catch {
      showStatus("error", "Bağlantı hatası.");
    } finally {
      setSaving(false);
    }
  }, [
    householdId,
    maxDailyStories,
    contentBoundary,
    timeLimitMinutes,
    requireParentApprovalForAi,
    allowImageGeneration,
    allowTts,
    blockedTopicsInput,
    customNotesInput,
    applyPolicy,
    refreshPolicy,
    refreshAudit,
    showStatus,
  ]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-[800px] flex-1 items-center justify-center px-6 py-20">
        <p className="text-on-surface-variant">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-8 px-6 py-10">
      <nav className="text-sm text-on-surface-variant">
        <a href="/app" className="hover:text-primary">
          Dashboard
        </a>
        <span className="mx-2">&gt;</span>
        <a href="/app/settings" className="hover:text-primary">
          Ayarlar
        </a>
        <span className="mx-2">&gt;</span>
        <span className="text-on-surface">Güvenlik</span>
      </nav>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
          Ebeveyn Güvenlik Ayarları
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Çocuğunuz için içerik sınırları, günlük kullanım ve üretim
          tercihlerini yönetin. Politikalar aile düzeyinde uygulanır.
        </p>
      </header>

      {statusMessage && (
        <div
          className={`rounded-xl border px-5 py-4 text-sm font-medium ${
            statusMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-on-surface">
            İçerik ve Kullanım
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Kullanım sınırlarını ve üretim seçeneklerini ayarlayın.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-on-surface">
              İçerik Sınırı
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {BOUNDARY_OPTIONS.map((option) => {
                const active = contentBoundary === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setContentBoundary(option.value)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? "border-primary bg-[#f3efff]"
                        : "border-outline-variant bg-white hover:bg-surface-container-low"
                    }`}
                    type="button"
                  >
                    <div className="font-bold text-on-surface">
                      {option.label}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="max-daily-stories"
                className="mb-1 block text-xs font-semibold text-on-surface-variant"
              >
                Günlük Maksimum Hikaye
              </label>
              <input
                id="max-daily-stories"
                type="number"
                min="0"
                max="50"
                value={maxDailyStories}
                onChange={(e) =>
                  setMaxDailyStories(
                    Math.min(
                      50,
                      Math.max(0, parseInt(e.target.value, 10) || 0),
                    ),
                  )
                }
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                Oturum Süresi (dakika, boş = sınır yok)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                placeholder="ör. 60"
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={requireParentApprovalForAi}
                onChange={(e) =>
                  setRequireParentApprovalForAi(e.target.checked)
                }
                className="h-4 w-4 accent-primary"
              />
              Yeni AI içerikleri için ebeveyn onayı istenilsin
            </label>
            <label className="flex items-center gap-3 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={allowImageGeneration}
                onChange={(e) => setAllowImageGeneration(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Görsel üretimine izin ver
            </label>
            <label className="flex items-center gap-3 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={allowTts}
                onChange={(e) => setAllowTts(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Seslendirmeye izin ver
            </label>
          </div>

          <div>
            <label
              htmlFor="blocked-topics"
              className="mb-1 block text-xs font-semibold text-on-surface-variant"
            >
              Engellenen Temalar (virgülle ayırın)
            </label>
            <input
              id="blocked-topics"
              type="text"
              value={blockedTopicsInput}
              onChange={(e) => setBlockedTopicsInput(e.target.value)}
              placeholder="ör. korku, kayıp"
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
              Ebeveyn Notları (her satır bir madde)
            </label>
            <textarea
              value={customNotesInput}
              onChange={(e) => setCustomNotesInput(e.target.value)}
              rows={3}
              placeholder="ör. nazik anlatım kullan"
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf] disabled:opacity-50"
              type="button"
            >
              {saving ? "Kaydediliyor..." : "Politikayı Kaydet"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-on-surface">
              Politika Geçmişi
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Güvenlik politikası değişiklikleri ve denetim kayıtları.
            </p>
          </div>
          {loadingAudit && (
            <span className="text-sm text-on-surface-variant">
              Yükleniyor...
            </span>
          )}
        </div>

        {audit.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-12 text-center">
            <p className="text-sm text-on-surface-variant">
              Henüz politikadeğişikliği kaydı yok.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant rounded-xl border border-outline-variant">
            {audit.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    {entry.action === "policy.update"
                      ? "Politika güncellendi"
                      : entry.action}
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {new Date(entry.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                {typeof entry.afterState.contentBoundary === "string" && (
                  <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
                    Sınır: {entry.afterState.contentBoundary}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
