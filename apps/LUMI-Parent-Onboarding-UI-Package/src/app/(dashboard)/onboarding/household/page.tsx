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
import { createIdempotencyKey } from "@/lib/api/idempotency";
import { useOnboardingStore } from "@/stores/onboarding.store";

const schema = z.object({
  name: z.string().min(2, "Aile adı en az 2 karakter olmalıdır."),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Sadece küçük harf, rakam ve tire kullanın."),
});

type FormValues = z.infer<typeof schema>;

export default function HouseholdPage() {
  const router = useRouter();
  const setIds = useOnboardingStore((state) => state.setIds);
  const [error, setError] = useState<{ message: string; requestId?: string }>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(undefined);

    try {
      const result = await apiRequest<{
        id: string;
        name: string;
        slug: string;
      }>("/api/v1/households", {
        method: "POST",
        headers: {
          "idempotency-key": createIdempotencyKey("household"),
        },
        body: JSON.stringify(values),
      });

      setIds({ householdId: result.id });
      router.push("/onboarding/child");
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
      <OnboardingProgress currentStep="household" />

      <div className="rounded-2xl border bg-background p-8">
        <h1 className="text-2xl font-semibold">
          Ailenizi tanımlayın
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bu alan çocuk profillerini ve dünyaları birlikte yönetmek için kullanılacak.
        </p>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-8 grid gap-5"
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium">Aile adı</span>
            <input
              {...form.register("name")}
              className="min-h-11 rounded-lg border px-3"
              placeholder="Oskay Ailesi"
            />
            <span className="text-sm text-destructive">
              {form.formState.errors.name?.message}
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Kısa adres</span>
            <input
              {...form.register("slug")}
              className="min-h-11 rounded-lg border px-3"
              placeholder="oskay-ailesi"
            />
            <span className="text-sm text-destructive">
              {form.formState.errors.slug?.message}
            </span>
          </label>

          <FormError
            message={error?.message}
            requestId={error?.requestId}
          />

          <SubmitButton pending={form.formState.isSubmitting}>
            Aileyi oluştur
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
