"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CostPreview } from "@/components/story/cost-preview";
import { StoryTypeSelector } from "@/components/story/story-type-selector";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { estimateStoryCost } from "@/lib/story/cost-estimator";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { useStoryCreationStore } from "@/stores/story-creation.store";

export default function NewStoryPage() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const story = useStoryCreationStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const estimate = useMemo(
    () =>
      estimateStoryCost({
        estimatedInputTokens: 6_000,
        estimatedOutputTokens:
          story.storyType === "interactive"
            ? 8_000
            : 5_000,
        textInputPerMillionTry: 8,
        textOutputPerMillionTry: 32,
        imageCount: story.includeImages
          ? story.imageCount
          : 0,
        imageUnitCostTry: 0.75,
        includeTts: story.includeTts,
        estimatedTtsCharacters: 12_000,
        ttsPerMillionCharactersTry: 450,
      }),
    [
      story.storyType,
      story.includeImages,
      story.imageCount,
      story.includeTts,
    ],
  );

  async function generateStory() {
    if (
      !onboarding.worldId ||
      !onboarding.childProfileId ||
      !onboarding.characterId
    ) {
      router.replace("/onboarding/household");
      return;
    }

    setPending(true);
    setError(undefined);

    try {
      const result = await apiRequest<{
        generationRequestId: string;
        estimatedCostTry: number;
      }>("/api/v1/stories/generate", {
        method: "POST",
        body: JSON.stringify({
          worldId: onboarding.worldId,
          childProfileId: onboarding.childProfileId,
          storyType: story.storyType,
          titlePrompt: story.titlePrompt || undefined,
          themePrompt: story.themePrompt || undefined,
          participantCharacterIds: [
            onboarding.characterId,
          ],
          selectedItemInstanceId:
            story.selectedInventoryItem
              ?.itemInstanceId,
          includeImages: story.includeImages,
          imageCount: story.imageCount,
          includeTts: story.includeTts,
        }),
      });

      router.push(
        `/stories/generating/${result.generationRequestId}`,
      );
    } catch (error) {
      setError((error as ApiClientError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Yeni hikâye
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          İlk maceranızı hazırlayın
        </h1>
      </div>

      <div className="rounded-2xl border bg-background p-6">
        <h2 className="text-lg font-medium">
          Hikâye türü
        </h2>
        <div className="mt-4">
          <StoryTypeSelector
            value={story.storyType}
            onChange={story.setStoryType}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-6">
        <h2 className="text-lg font-medium">
          Hikâye fikri
        </h2>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">
              Başlık fikri
            </span>
            <input
              value={story.titlePrompt}
              onChange={(event) =>
                story.setTitlePrompt(event.target.value)
              }
              className="min-h-11 rounded-lg border px-3"
              placeholder="Kayıp Işık Haritası"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">
              Tema veya özel istek
            </span>
            <textarea
              value={story.themePrompt}
              onChange={(event) =>
                story.setThemePrompt(event.target.value)
              }
              className="min-h-28 rounded-lg border p-3"
              placeholder="Merak, arkadaşlık ve cesaret temalı olsun."
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-6">
        <h2 className="text-lg font-medium">
          Medya seçenekleri
        </h2>

        <div className="mt-4 grid gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={story.includeImages}
              onChange={(event) =>
                story.setIncludeImages(
                  event.target.checked,
                )
              }
            />
            Hikâye görselleri oluştur
          </label>

          {story.includeImages ? (
            <label className="grid gap-2">
              <span className="text-sm">
                Görsel sayısı
              </span>
              <input
                type="number"
                min={0}
                max={12}
                value={story.imageCount}
                onChange={(event) =>
                  story.setImageCount(
                    Number(event.target.value),
                  )
                }
                className="min-h-11 rounded-lg border px-3"
              />
            </label>
          ) : null}

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={story.includeTts}
              onChange={(event) =>
                story.setIncludeTts(
                  event.target.checked,
                )
              }
            />
            Seslendirme oluştur
          </label>
        </div>
      </div>

      <CostPreview estimate={estimate} />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive"
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={generateStory}
        className="min-h-12 rounded-lg bg-primary px-6 font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending
          ? "Hikâye hazırlanıyor..."
          : "Hikâyeyi oluştur"}
      </button>
    </section>
  );
}
