"use client";

import { useCallback, useEffect, useState } from "react";

interface TaskSetting {
  id: string;
  taskType: string;
  modelId: string;
  reasoningLevel: string;
  temperature: number;
  maxOutputTokens: number;
  enabled: boolean;
}

interface LlmSettings {
  hasApiKey: boolean;
  maskedApiKey: string | null;
  enabled: boolean;
  provider: string;
  taskSettings: TaskSetting[];
}

const TASK_LABELS: Record<string, string> = {
  character_origin_generation: "Karakter Kökeni Üretimi",
  story_outline_generation: "Hikaye Taslağı Üretimi",
  story_turn_generation: "Hikaye Sahne Üretimi",
  safety_review: "İçerik Güvenliği Kontrolü",
  character_memory_summary: "Karakter Hafıza Özeti",
  parent_explanation: "Ebeveyn Açıklama Üretimi",
};

const TASK_DESCRIPTIONS: Record<string, string> = {
  character_origin_generation: "Karakter onboarding orijin önerileri",
  story_outline_generation: "Gelecek sprintler için hikaye taslağı",
  story_turn_generation: "Hikaye akışında sonraki sahne/turn üretimi",
  safety_review: "İçerik güvenliği/kural kontrolü",
  character_memory_summary: "Karakter/hikaye hafıza özeti",
  parent_explanation: "Ebeveyne açıklama/özet üretimi",
};

const PRESET_MODELS = [
  {
    id: "aion-labs/aion-3.0-mini",
    label: "Aion 3.0 Mini (story/orijin önerileri)",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    label: "DeepSeek V3 0324 (ekonomik reasoning)",
  },
  {
    id: "deepseek/deepseek-chat-v3.1",
    label: "DeepSeek V3.1 (güçlü reasoning)",
  },
  {
    id: "mistralai/mistral-small-3.2-24b-instruct",
    label: "Mistral Small 3.2 24B (ucuz özet/açıklama)",
  },
  {
    id: "meta-llama/llama-guard-4-12b",
    label: "Llama Guard 4 12B (güvenlik kontrolü)",
  },
  {
    id: "meta-llama/llama-guard-3-8b",
    label: "Llama Guard 3 8B (güvenlik alternatifi)",
  },
  { id: "qwen/qwen3.5-flash-02-23", label: "Qwen 3.5 Flash (çok ucuz/hızlı)" },
  { id: "qwen/qwen3.6-flash", label: "Qwen 3.6 Flash (büyük context)" },
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite (düşük maliyet)",
  },
  {
    id: "google/gemini-3.1-flash-lite-preview",
    label: "Gemini 3.1 Flash Lite Preview",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT OSS 120B (ekonomik yüksek reasoning)",
  },
  { id: "openai/gpt-oss-120b:free", label: "GPT OSS 120B Free (deneme/dev)" },
  { id: "__custom__", label: "Özel model ID" },
];

const DEFAULT_TASK_CONFIGS: Array<{
  taskType: string;
  modelId: string;
  reasoningLevel: string;
  temperature: number;
  maxOutputTokens: number;
  enabled: boolean;
}> = [
  {
    taskType: "character_origin_generation",
    modelId: "aion-labs/aion-3.0-mini",
    reasoningLevel: "medium",
    temperature: 0.85,
    maxOutputTokens: 1800,
    enabled: true,
  },
  {
    taskType: "story_outline_generation",
    modelId: "deepseek/deepseek-chat-v3-0324",
    reasoningLevel: "medium",
    temperature: 0.75,
    maxOutputTokens: 2400,
    enabled: false,
  },
  {
    taskType: "story_turn_generation",
    modelId: "aion-labs/aion-3.0-mini",
    reasoningLevel: "high",
    temperature: 0.85,
    maxOutputTokens: 2200,
    enabled: false,
  },
  {
    taskType: "safety_review",
    modelId: "meta-llama/llama-guard-4-12b",
    reasoningLevel: "low",
    temperature: 0,
    maxOutputTokens: 512,
    enabled: false,
  },
  {
    taskType: "character_memory_summary",
    modelId: "mistralai/mistral-small-3.2-24b-instruct",
    reasoningLevel: "low",
    temperature: 0.3,
    maxOutputTokens: 900,
    enabled: false,
  },
  {
    taskType: "parent_explanation",
    modelId: "mistralai/mistral-small-3.2-24b-instruct",
    reasoningLevel: "low",
    temperature: 0.4,
    maxOutputTokens: 900,
    enabled: false,
  },
];

export default function LlmSettingsClientPage() {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [settings, setSettings] = useState<LlmSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [taskForms, setTaskForms] = useState<Record<string, TaskSetting>>({});
  const [customModelInputs, setCustomModelInputs] = useState<
    Record<string, string>
  >({});
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    model?: string;
    error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        const hId = data.onboarding?.householdId;
        if (hId) {
          setHouseholdId(hId);
          return fetch(
            `/api/settings/llm?householdId=${encodeURIComponent(hId)}`,
          );
        }
        setOnboardingError("Aile evreni bulunamadı. Önce kurulumu tamamlayın.");
        return null;
      })
      .then((response) => {
        if (response) return response.json();
        return null;
      })
      .then((data) => {
        if (data?.data) {
          setSettings(data.data);
          const forms: Record<string, TaskSetting> = {};
          for (const t of data.data.taskSettings) {
            forms[t.taskType] = t;
          }
          setTaskForms(forms);
        }
        setLoading(false);
      })
      .catch(() => {
        setOnboardingError("Kurulum durumu yüklenemedi.");
        setLoading(false);
      });
  }, []);

  const showStatus = useCallback((type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  }, []);

  const handleSaveKey = useCallback(async () => {
    if (!householdId) {
      showStatus("error", "Aile evreni bulunamadı. Önce kurulumu tamamlayın.");
      return;
    }
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert-key",
          householdId,
          apiKey: apiKeyInput.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSettings(json.data);
        setApiKeyInput("");
        setShowApiKeyInput(false);
        showStatus("success", "OpenRouter API anahtarı kaydedildi.");
      } else {
        showStatus("error", json.message ?? "Kaydetme başarısız.");
      }
    } catch {
      showStatus("error", "Bağlantı hatası.");
    } finally {
      setSaving(false);
    }
  }, [householdId, apiKeyInput, showStatus]);

  const handleDeleteKey = useCallback(async () => {
    if (!householdId) {
      showStatus("error", "Aile evreni bulunamadı. Önce kurulumu tamamlayın.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      const json = await res.json();
      if (res.ok) {
        setSettings(json.data);
        showStatus("success", "OpenRouter API anahtarı silindi.");
      } else {
        showStatus("error", json.message ?? "Silme başarısız.");
      }
    } catch {
      showStatus("error", "Bağlantı hatası.");
    } finally {
      setSaving(false);
    }
  }, [householdId, showStatus]);

  const handleTestConnection = useCallback(async () => {
    if (!householdId) {
      setTestResult({
        success: false,
        error: "Aile evreni bulunamadı. Önce kurulumu tamamlayın.",
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-connection", householdId }),
      });
      const json = await res.json();
      if (res.ok) {
        setTestResult(json.data);
      } else {
        setTestResult({
          success: false,
          error: json.message ?? "Test başarısız.",
        });
      }
    } catch {
      setTestResult({ success: false, error: "Bağlantı hatası." });
    } finally {
      setTesting(false);
    }
  }, [householdId]);

  const handleSaveTask = useCallback(
    async (taskType: string) => {
      if (!householdId) {
        showStatus(
          "error",
          "Aile evreni bulunamadı. Önce kurulumu tamamlayın.",
        );
        return;
      }
      const form = taskForms[taskType];
      if (!form) {
        showStatus("error", "Görev yapılandırması bulunamadı.");
        return;
      }
      setSaving(true);
      try {
        const res = await fetch("/api/settings/llm", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upsert-task",
            householdId,
            taskType: form.taskType,
            modelId: form.modelId,
            reasoningLevel: form.reasoningLevel,
            temperature: form.temperature,
            maxOutputTokens: form.maxOutputTokens,
            enabled: form.enabled,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          setTaskForms((prev) => ({ ...prev, [taskType]: json.data }));
          showStatus(
            "success",
            `${TASK_LABELS[taskType] ?? taskType} ayarları kaydedildi.`,
          );
        } else {
          showStatus("error", json.message ?? "Kaydetme başarısız.");
        }
      } catch {
        showStatus("error", "Bağlantı hatası.");
      } finally {
        setSaving(false);
      }
    },
    [householdId, taskForms, showStatus],
  );

  const updateFormField = useCallback(
    (
      taskType: string,
      field: keyof TaskSetting,
      value: string | number | boolean,
    ) => {
      setTaskForms((prev) => ({
        ...prev,
        [taskType]: {
          ...(prev[taskType] ?? {}),
          [field]: value,
        } as TaskSetting,
      }));
    },
    [],
  );

  const initTaskConfig = useCallback((taskType: string) => {
    const defaults = DEFAULT_TASK_CONFIGS.find((c) => c.taskType === taskType);
    setTaskForms((prev) => ({
      ...prev,
      [taskType]: {
        id: "",
        taskType,
        modelId: defaults?.modelId ?? "aion-labs/aion-3.0-mini",
        reasoningLevel: defaults?.reasoningLevel ?? "medium",
        temperature: defaults?.temperature ?? 0.8,
        maxOutputTokens: defaults?.maxOutputTokens ?? 1800,
        enabled: defaults?.enabled ?? false,
      },
    }));
  }, []);

  const handleModelSelect = useCallback(
    (taskType: string, selectedId: string) => {
      if (selectedId === "__custom__") {
        const custom = customModelInputs[taskType] ?? "";
        updateFormField(
          taskType,
          "modelId",
          custom || "aion-labs/aion-3.0-mini",
        );
      } else {
        updateFormField(taskType, "modelId", selectedId);
      }
    },
    [customModelInputs, updateFormField],
  );

  if (loading) {
    return (
      <div className="mx-auto flex max-w-[800px] flex-1 items-center justify-center px-6 py-20">
        <p className="text-on-surface-variant">Yükleniyor...</p>
      </div>
    );
  }

  if (onboardingError) {
    return (
      <section className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-8 px-6 py-10">
        <nav className="text-sm text-on-surface-variant">
          <a href="/app" className="hover:text-primary">
            Dashboard
          </a>
          <span className="mx-2">&gt;</span>
          <span className="text-on-surface">Ayarlar</span>
        </nav>
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
            Ayarlar
          </h1>
          <p className="mt-2 text-on-surface-variant">
            OpenRouter bağlantısı ve görev bazlı model yapılandırması
          </p>
        </header>
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {onboardingError}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-8 px-6 py-10">
      <nav className="text-sm text-on-surface-variant">
        <a href="/app" className="hover:text-primary">
          Dashboard
        </a>
        <span className="mx-2">&gt;</span>
        <span className="text-on-surface">Ayarlar</span>
      </nav>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
          Ayarlar
        </h1>
        <p className="mt-2 text-on-surface-variant">
          OpenRouter bağlantısı ve görev bazlı model yapılandırması
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
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-on-surface">
              OpenRouter Bağlantısı
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              API anahtarını girerek LLM destekli karakter üretimini
              etkinleştir.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              settings?.hasApiKey
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {settings?.hasApiKey ? "Anahtar var" : "Anahtar yok"}
          </span>
        </div>

        {settings?.hasApiKey && settings.maskedApiKey && (
          <div className="mb-5 rounded-lg bg-surface-container-low px-4 py-3 font-mono text-sm text-on-surface-variant">
            {settings.maskedApiKey}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!showApiKeyInput ? (
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
              type="button"
            >
              {settings?.hasApiKey ? "Anahtarı Değiştir" : "API Anahtarı Ekle"}
            </button>
          ) : (
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-or-v1-..."
                className="flex-1 rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveKey}
                  disabled={saving || !apiKeyInput.trim()}
                  className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf] disabled:opacity-50"
                  type="button"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  onClick={() => {
                    setShowApiKeyInput(false);
                    setApiKeyInput("");
                  }}
                  className="inline-flex h-10 items-center rounded-lg border border-outline-variant bg-white px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
                  type="button"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {settings?.hasApiKey && (
            <button
              onClick={handleDeleteKey}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-lg border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              type="button"
            >
              Anahtarı Sil
            </button>
          )}

          <button
            onClick={handleTestConnection}
            disabled={testing || !settings?.hasApiKey}
            className="inline-flex h-10 items-center rounded-lg border border-outline-variant bg-surface-container-low px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
            type="button"
          >
            {testing ? "Test ediliyor..." : "Bağlantıyı Test Et"}
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              testResult.success
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {testResult.success
              ? `Bağlantı başarılı. Model: ${testResult.model ?? "?"}`
              : `Bağlantı hatası: ${testResult.error ?? "?"}`}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-outline-variant bg-white p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-on-surface">
            Görev Bazlı Model Ayarları
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Her görev türü için kullanılacak model ve parametreleri yapılandır.
          </p>
        </div>

        <div className="space-y-6">
          {DEFAULT_TASK_CONFIGS.map((defaultConfig) => {
            const taskType = defaultConfig.taskType;
            const form = taskForms[taskType];

            if (!form) {
              return (
                <div
                  key={taskType}
                  className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-on-surface">
                        {TASK_LABELS[taskType] ?? taskType}
                      </h3>
                      <p className="mt-0.5 text-sm text-on-surface-variant">
                        {TASK_DESCRIPTIONS[taskType] ?? ""}
                      </p>
                    </div>
                    <button
                      onClick={() => initTaskConfig(taskType)}
                      className="inline-flex h-9 items-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
                      type="button"
                    >
                      Yapılandır
                    </button>
                  </div>
                </div>
              );
            }

            const isCustomModel = !PRESET_MODELS.some(
              (m) => m.id === form.modelId,
            );
            const selectedPreset = isCustomModel ? "__custom__" : form.modelId;

            return (
              <div
                key={taskType}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-on-surface">
                        {TASK_LABELS[taskType] ?? taskType}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          form.id
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {form.id ? "Kaydedildi" : "Kaydedilmedi"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-on-surface-variant">
                      {TASK_DESCRIPTIONS[taskType] ?? ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) =>
                        updateFormField(taskType, "enabled", e.target.checked)
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    Aktif
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                      Model
                    </label>
                    <select
                      value={selectedPreset}
                      onChange={(e) =>
                        handleModelSelect(taskType, e.target.value)
                      }
                      className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {PRESET_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {selectedPreset === "__custom__" && (
                      <input
                        type="text"
                        value={customModelInputs[taskType] ?? ""}
                        onChange={(e) => {
                          setCustomModelInputs((prev) => ({
                            ...prev,
                            [taskType]: e.target.value,
                          }));
                          updateFormField(taskType, "modelId", e.target.value);
                        }}
                        placeholder="model/id giriniz"
                        className="mt-2 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                      Reasoning
                    </label>
                    <select
                      value={form.reasoningLevel}
                      onChange={(e) =>
                        updateFormField(
                          taskType,
                          "reasoningLevel",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                      Temperature
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.05"
                      value={form.temperature}
                      onChange={(e) =>
                        updateFormField(
                          taskType,
                          "temperature",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                      Max Output Tokens
                    </label>
                    <input
                      type="number"
                      min="256"
                      max="8000"
                      step="100"
                      value={form.maxOutputTokens}
                      onChange={(e) =>
                        updateFormField(
                          taskType,
                          "maxOutputTokens",
                          parseInt(e.target.value, 10) || 256,
                        )
                      }
                      className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleSaveTask(taskType)}
                    disabled={saving}
                    className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf] disabled:opacity-50"
                    type="button"
                  >
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
