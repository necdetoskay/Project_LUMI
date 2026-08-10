import { notFound } from "next/navigation";

import { isDemoWebControlEnabled } from "@/lib/demo-control";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DemoControlPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isDemoWebControlEnabled()) notFound();

  const params = await searchParams;
  const result = typeof params.result === "string" ? params.result : undefined;
  const action = typeof params.action === "string" ? params.action : undefined;
  const message =
    typeof params.message === "string" ? params.message : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Project LUMI
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Demo Universe Control
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Elif → Lina → Işık Vadisi referans evrenini tarayıcıdan hazırla,
          durumunu kontrol et veya sıfırla.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <form action="/api/demo-control" method="post" className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Demo kontrol anahtarı</span>
            <input
              type="password"
              name="token"
              required
              autoComplete="off"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="LUMI_DEMO_WEB_CONTROL_TOKEN"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="action"
              value="prepare"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Demo Universe Hazırla
            </button>
            <button
              type="submit"
              name="action"
              value="status"
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Durumu Göster
            </button>
            <button
              type="submit"
              name="action"
              value="reset"
              className="rounded-md border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive"
            >
              Demo Universe Sıfırla
            </button>
          </div>
        </form>
      </section>

      {result && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">
            {result === "success" ? "İşlem başarılı" : "İşlem başarısız"}
            {action ? ` — ${action}` : ""}
          </h2>
          {message && (
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
              {message}
            </pre>
          )}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Bu sayfa yalnız LUMI_DEMO_WEB_CONTROL_ENABLED=true olduğunda mevcuttur
        ve her işlem sunucu tarafında kontrol anahtarı doğrulaması gerektirir.
      </p>
    </main>
  );
}
