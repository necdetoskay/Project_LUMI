import { getAuthPool } from "@/lib/auth/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckState = "ok" | "warning" | "error";

type Check = {
  label: string;
  state: CheckState;
  detail: string;
};

function hostOf(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}

async function checkDatabase(): Promise<Check> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      label: "Database (Neon/PostgreSQL)",
      state: "error",
      detail: "DATABASE_URL tanımlı değil.",
    };
  }

  try {
    await getAuthPool().query("SELECT 1");
    return {
      label: "Database (Neon/PostgreSQL)",
      state: "ok",
      detail: `Bağlantı başarılı · ${hostOf(process.env.DATABASE_URL) ?? "host bilinmiyor"}`,
    };
  } catch {
    return {
      label: "Database (Neon/PostgreSQL)",
      state: "error",
      detail: `DATABASE_URL mevcut fakat bağlantı başarısız · ${hostOf(process.env.DATABASE_URL) ?? "host bilinmiyor"}`,
    };
  }
}

async function checkPublicStorage(): Promise<Check> {
  const publicUrl = process.env.OBJECT_STORAGE_PUBLIC_URL?.trim();
  if (!publicUrl) {
    return {
      label: "Storage public URL",
      state: "warning",
      detail:
        "OBJECT_STORAGE_PUBLIC_URL tanımlı değil. Tarayıcıdaki görsellerin kırık görünmesinin nedeni bu olabilir.",
    };
  }

  try {
    const response = await fetch(publicUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return {
      label: "Storage public URL",
      state: response.status >= 500 ? "error" : "ok",
      detail: `Erişildi · ${hostOf(publicUrl)} · HTTP ${response.status}`,
    };
  } catch {
    return {
      label: "Storage public URL",
      state: "error",
      detail: `URL tanımlı fakat erişilemiyor · ${hostOf(publicUrl) ?? "geçersiz URL"}`,
    };
  }
}

function storageConfigurationChecks(): Check[] {
  const bucket =
    process.env.OBJECT_STORAGE_BUCKET?.trim() ||
    process.env.CLOUDFLARE_R2_BUCKET?.trim();
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT?.trim();

  return [
    {
      label: "Storage bucket",
      state: bucket ? "ok" : "error",
      detail: bucket ? `Tanımlı · ${bucket}` : "Bucket adı tanımlı değil.",
    },
    {
      label: "Storage API endpoint",
      state: endpoint ? "ok" : "error",
      detail: endpoint
        ? `Tanımlı · ${hostOf(endpoint) ?? "geçersiz URL"}`
        : "OBJECT_STORAGE_ENDPOINT tanımlı değil.",
    },
  ];
}

function badge(state: CheckState) {
  if (state === "ok") return "✓ OK";
  if (state === "warning") return "! UYARI";
  return "× HATA";
}

export default async function HealthPage() {
  const checks = [
    await checkDatabase(),
    ...storageConfigurationChecks(),
    await checkPublicStorage(),
  ];
  const hasError = checks.some((check) => check.state === "error");
  const hasWarning = checks.some((check) => check.state === "warning");

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ marginBottom: 8 }}>LUMI Sistem Sağlığı</h1>
      <p style={{ marginTop: 0, opacity: 0.75 }}>
        Veritabanı ve görsel depolama yapılandırmasının çalışma zamanı kontrolü.
        Secret değerler bu sayfada gösterilmez.
      </p>

      <div
        style={{
          margin: "24px 0",
          padding: 16,
          border: "1px solid #d1d5db",
          borderRadius: 12,
        }}
      >
        <strong>Genel durum: </strong>
        {hasError ? "Hata var" : hasWarning ? "Uyarı var" : "Hazır"}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {checks.map((check) => (
          <section
            key={check.label}
            style={{
              padding: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
              }}
            >
              <strong>{check.label}</strong>
              <span>{badge(check.state)}</span>
            </div>
            <p style={{ marginBottom: 0, opacity: 0.8 }}>{check.detail}</p>
          </section>
        ))}
      </div>

      <p style={{ marginTop: 24, opacity: 0.7 }}>
        Not: R2 S3 API endpoint'i ile tarayıcıda kullanılacak public asset URL aynı
        şey değildir. Private/public erişim modeli ayrıca doğrulanmalıdır.
      </p>
    </main>
  );
}
