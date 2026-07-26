import Link from "next/link";

export default function DashboardPage() {
  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border bg-background p-8">
        <p className="text-sm font-medium text-primary">
          Başlangıç
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          LUMI dünyanızı oluşturalım
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Ailenizi, çocuğunuzu, dünyanızı ve ilk karakterinizi birkaç adımda hazırlayın.
        </p>

        <Link
          href="/onboarding/household"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground"
        >
          Kuruluma başla
        </Link>
      </div>
    </section>
  );
}
