"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { SubmitButton } from "@/components/onboarding/submit-button";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { createIdempotencyKey } from "@/lib/api/idempotency";
import { useOnboardingStore } from "@/stores/onboarding.store";

export default function AvatarPage() {
  const router = useRouter();
  const worldId = useOnboardingStore((state) => state.worldId);
  const childProfileId = useOnboardingStore((state) => state.childProfileId);
  const currentLocationId = useOnboardingStore((state) => state.locationId);
  const setIds = useOnboardingStore((state) => state.setIds);
  const [name, setName] = useState("Lina");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string }>();

  async function createAvatar() {
    if (!worldId || !childProfileId || !currentLocationId) {
      router.replace("/onboarding/household");
      return;
    }

    setPending(true);

    try {
      const result = await apiRequest<{
        characterId: string;
        inventoryId: string;
      }>(`/api/v1/worlds/${worldId}/characters`, {
        method: "POST",
        headers: {
          "idempotency-key": createIdempotencyKey("avatar"),
        },
        body: JSON.stringify({
          childProfileId,
          currentLocationId,
          name,
          slug: name
            .toLocaleLowerCase("tr-TR")
            .replaceAll("ı", "i")
            .replaceAll("ş", "s")
            .replaceAll("ğ", "g")
            .replaceAll("ü", "u")
            .replaceAll("ö", "o")
            .replaceAll("ç", "c")
            .replace(/[^a-z0-9]+/g, "-"),
        }),
      });

      setIds(result);
      router.push("/onboarding/summary");
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
      <OnboardingProgress currentStep="avatar" />

      <div className="rounded-2xl border bg-background p-8">
        <h1 className="text-2xl font-semibold">
          İlk karakterinizi oluşturun
        </h1>

        <label className="mt-8 grid gap-2">
          <span className="text-sm font-medium">Karakter adı</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 rounded-lg border px-3"
          />
        </label>

        <div className="mt-6 grid gap-4">
          <FormError
            message={error?.message}
            requestId={error?.requestId}
          />
          <SubmitButton pending={pending} onClick={createAvatar}>
            Karakteri oluştur
          </SubmitButton>
        </div>
      </div>
    </>
  );
}
