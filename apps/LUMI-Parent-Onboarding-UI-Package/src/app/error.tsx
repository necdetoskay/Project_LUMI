"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border bg-background p-8">
      <h2 className="text-2xl font-semibold">
        Bir şeyler ters gitti
      </h2>
      <p className="mt-2 text-muted-foreground">
        İşlem tamamlanamadı. Lütfen tekrar deneyin.
      </p>
      <button
        onClick={reset}
        className="mt-6 min-h-11 rounded-lg bg-primary px-5 font-medium text-primary-foreground"
      >
        Tekrar dene
      </button>
    </div>
  );
}
