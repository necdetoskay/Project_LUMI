"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { SubmitButton } from "@/components/onboarding/submit-button";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { createIdempotencyKey } from "@/lib/api/idempotency";
import { useOnboardingStore } from "@/stores/onboarding.store";

export default function WorldPage() {
  const router = useRouter();
  const householdId = useOnboardingStore((state) => state.householdId);
  const setIds = useOnboardingStore((state) => state.setIds);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string }>();

  async function createWorld() {
    if (!householdId) {
      router.replace("/onboarding/household");
      return;
    }

    setPending(true);
    setError(undefined);

    try {
      const result = await apiRequest<{
        universeId: string;
        worldId: string;
        regionId: string;
        locationId: string;
      }>(`/api/v1/households/${householdId}/worlds`, {
        method: "POST",
        headers: {
          "idempotency-key": createIdempotencyKey("world"),
        },
        body: JSON.stringify({
          universeName: "LUMI Evreni",
          universeSlug: "lumi-evreni",
          worldName: "Işık Adası",
          worldSlug: "isik-adasi",
          regionName: "Yeşil Vadi",
          regionSlug: "yesil-vadi",
          locationName: "Başlangıç Evi",
          locationSlug: "baslangic-evi",
        }),
      });

      setIds(result);
      router.push("/onboarding/avatar");
    } catch (error) {
      const apiError = error as ApiClientError;
      setError({
        message: apiError.message,
        requestId: apiError.requestId,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <OnboardingProgress currentStep="world" />

      <div className="rounded-2xl border bg-background p-8">
        <h1 className="text-2xl font-semibold">
          İlk dünyanızı oluşturun
        </h1>
        <p className="mt-2 text-muted-foreground">
          Başlangıç dünyası daha sonra yeni bölgeler, adalar ve karakterlerle genişletilebilir.
        </p>

        <div className="mt-8 rounded-xl border bg-muted/20 p-5">
          <h2 className="font-medium">Işık Adası</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Yeşil Vadi bölgesinde, Başlangıç Evi konumuyla açılan güvenli ilk dünya.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <FormError
            message={error?.message}
            requestId={error?.requestId}
          />
          <SubmitButton pending={pending} onClick={createWorld}>
            Dünyayı oluştur
          </SubmitButton>
        </div>
      </div>
    </>
  );
}
