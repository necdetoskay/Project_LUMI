"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormError } from "@/components/onboarding/form-error";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { SubmitButton } from "@/components/onboarding/submit-button";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { useOnboardingStore } from "@/stores/onboarding.store";

const schema = z.object({
  name: z.string().min(1, "Çocuğun adı zorunludur."),
  birthYear: z.coerce.number().int().min(2010).max(2100).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ChildPage() {
  const router = useRouter();
  const householdId = useOnboardingStore((state) => state.householdId);
  const setIds = useOnboardingStore((state) => state.setIds);
  const [error, setError] = useState<{ message: string; requestId?: string }>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    if (!householdId) {
      router.replace("/onboarding/household");
      return;
    }

    try {
      const result = await apiRequest<{ id: string }>(
        `/api/v1/households/${householdId}/children`,
        {
          method: "POST",
          body: JSON.stringify(values),
        },
      );

      setIds({ childProfileId: result.id });
      router.push("/onboarding/world");
    } catch (error) {
      const apiError = error as ApiClientError;
      setError({
        message: apiError.message,
        requestId: apiError.requestId,
      });
    }
  }

  return (
    <>
      <OnboardingProgress currentStep="child" />

      <div className="rounded-2xl border bg-background p-8">
        <h1 className="text-2xl font-semibold">
          Çocuk profilini oluşturun
        </h1>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-8 grid gap-5"
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium">Adı</span>
            <input
              {...form.register("name")}
              className="min-h-11 rounded-lg border px-3"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Doğum yılı</span>
            <input
              {...form.register("birthYear")}
              type="number"
              className="min-h-11 rounded-lg border px-3"
            />
          </label>

          <FormError
            message={error?.message}
            requestId={error?.requestId}
          />

          <SubmitButton pending={form.formState.isSubmitting}>
            Profili oluştur
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
