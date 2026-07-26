"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";

export default function OpportunityDetailPage({
  params: _params,
}: {
  params: Promise<{
    opportunityId: string;
  }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  async function accept() {
    setPending(true);

    try {
      await apiRequest(
        "/api/v1/interaction-opportunities/opportunity-1/accept",
        {
          method: "POST",
        },
      );
    } finally {
      setPending(false);
    }

    router.push(
      "/stories/new?source=story-hook",
    );
  }

  async function decline() {
    setPending(true);

    try {
      await apiRequest(
        "/api/v1/interaction-opportunities/opportunity-1/decline",
        {
          method: "POST",
        },
      );
    } finally {
      setPending(false);
    }

    router.push("/feed");
  }

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border bg-background p-8">
      <p className="text-sm font-medium text-primary">
        Yeni fırsat
      </p>

      <h1 className="mt-2 text-3xl font-semibold">
        Yaşlı denizciden bir davet
      </h1>

      <p className="mt-4 leading-7 text-muted-foreground">
        Denizci, kıyıda bulunan eski pusulanın yalnızca cesur ve meraklı bir çocuk tarafından çalıştırılabileceğine inanıyor.
      </p>

      <div className="mt-6 rounded-xl bg-muted/30 p-5">
        <h2 className="font-medium">
          Hikâye önizlemesi
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Kıyı, kayıp pusula, eski bir sır ve yeni bir yolculuk.
        </p>
      </div>

      {snoozed ? (
        <div className="mt-6 rounded-lg border p-4 text-sm">
          Bu fırsat daha sonra tekrar gösterilecek.
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={accept}
          className="min-h-11 rounded-lg bg-primary px-5 font-medium text-primary-foreground disabled:opacity-60"
        >
          Macerayı kabul et
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => setSnoozed(true)}
          className="min-h-11 rounded-lg border px-5 font-medium"
        >
          Daha sonra göster
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={decline}
          className="min-h-11 rounded-lg border px-5 font-medium text-muted-foreground"
        >
          İlgilenmiyorum
        </button>
      </div>
    </section>
  );
}
