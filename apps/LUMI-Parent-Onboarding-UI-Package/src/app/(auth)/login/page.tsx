export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <section className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-sm">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-medium text-primary">
            Project LUMI
          </p>
          <h1 className="text-3xl font-semibold">
            Hikâye evreninize hoş geldiniz
          </h1>
          <p className="text-muted-foreground">
            Çocuğunuz için yaşayan ve gelişen bir dünya oluşturun.
          </p>
        </div>

        <form action="/api/auth/signin" method="post" className="space-y-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">E-posta</span>
            <input
              name="email"
              type="email"
              required
              className="min-h-11 rounded-lg border px-3"
            />
          </label>

          <button
            type="submit"
            className="min-h-11 w-full rounded-lg bg-primary px-4 font-medium text-primary-foreground"
          >
            Devam et
          </button>
        </form>
      </section>
    </main>
  );
}
