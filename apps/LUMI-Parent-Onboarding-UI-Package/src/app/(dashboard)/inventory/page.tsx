"use client";

import Link from "next/link";
import { useOnboardingStore } from "@/stores/onboarding.store";

export default function InventoryPage() {
  const inventoryId = useOnboardingStore(
    (state) => state.inventoryId,
  );

  return (
    <section className="rounded-2xl border bg-background p-8">
      <p className="text-sm font-medium text-primary">
        Envanter
      </p>
      <h1 className="mt-2 text-3xl font-semibold">
        İlk maceranız için hazır
      </h1>

      <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">
          Envanteriniz şu anda boş
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Hikâyeler sırasında bulunan eşyalar burada kalıcı olarak saklanacak.
        </p>
        {inventoryId ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Envanter kodu: {inventoryId}
          </p>
        ) : null}
      </div>

      <Link
        href="/stories/new"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground"
      >
        İlk hikâyeyi oluştur
      </Link>
    </section>
  );
}
