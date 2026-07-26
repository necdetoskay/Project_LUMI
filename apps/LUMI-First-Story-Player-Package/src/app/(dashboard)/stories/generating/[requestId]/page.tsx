import Link from "next/link";

export default async function StoryGeneratingPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border bg-background p-8 text-center">
      <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-primary/20" />

      <h1 className="mt-6 text-2xl font-semibold">
        Hikâyeniz hazırlanıyor
      </h1>
      <p className="mt-3 text-muted-foreground">
        Dünya, karakterler, seçimler ve başlangıç sahnesi oluşturuluyor.
      </p>

      <p className="mt-5 text-xs text-muted-foreground">
        İstek kodu: {requestId}
      </p>

      <Link
        href={`/stories/player/demo-session`}
        className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground"
      >
        Hazır hikâyeyi aç
      </Link>
    </section>
  );
}
