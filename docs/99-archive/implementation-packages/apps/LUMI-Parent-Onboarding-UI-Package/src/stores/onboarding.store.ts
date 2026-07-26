import { create } from "zustand";
import { persist } from "zustand/middleware";

type OnboardingState = {
  householdId?: string;
  childProfileId?: string;
  universeId?: string;
  worldId?: string;
  regionId?: string;
  locationId?: string;
  characterId?: string;
  inventoryId?: string;
  setIds: (ids: Partial<Omit<OnboardingState, "setIds" | "reset">>) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      setIds: (ids) => set(ids),
      reset: () =>
        set({
          householdId: undefined,
          childProfileId: undefined,
          universeId: undefined,
          worldId: undefined,
          regionId: undefined,
          locationId: undefined,
          characterId: undefined,
          inventoryId: undefined,
        }),
    }),
    {
      name: "lumi-onboarding",
    },
  ),
);
