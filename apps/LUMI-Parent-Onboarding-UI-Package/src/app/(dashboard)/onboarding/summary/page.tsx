"use client";

import Link from "next/link";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { useOnboardingStore } from "@/stores/onboarding.store";

export default function SummaryPage() {
  const state = useOnboardingStore();

  return (
    <>
      <OnboardingProgress currentStep="summary" />

      <div className="rounded-2xl border bg-background p-8">
        <p className="text-sm font-medium text-primary">
          Hazır
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          LUMI temel dünyanız oluşturuldu
        </h1>
        <p className="mt-3 text-muted-foreground">
          Aile, çocuk profili, dünya, başlangıç konumu, karakter ve kişisel envanter hazır.
        </p>

        <dl className="mt-8 grid gap-3 rounded-xl border p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Household</dt>
            <dd className="font-mono">{state.householdId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>World</dt>
            <dd className="font-mono">{state.worldId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Character</dt>
            <dd className="font-mono">{state.characterId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Inventory</dt>
            <dd className="font-mono">{state.inventoryId}</dd>
          </div>
        </dl>

        <Link
          href="/inventory"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground"
        >
          Envanteri görüntüle
        </Link>
      </div>
    </>
  );
}
