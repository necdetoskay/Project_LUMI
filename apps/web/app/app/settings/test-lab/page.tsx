import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { getOnboardingState } from "@lumi/profiles/application";

import CharacterDnaTestPanel from "./character-dna-test-panel";
import DeepOriginTestPanel from "./deep-origin-test-panel";
import EnvironmentGenesisTestPanel from "./environment-genesis-test-panel";
import GenesisDerivedStagePanel from "./genesis-derived-stage-panel";
import GenesisQualificationPanel from "./genesis-qualification-panel";
import InventoryGenesisTestPanel from "./inventory-genesis-test-panel";
import MemoryThreadGenesisTestPanel from "./memory-thread-genesis-test-panel";
import OnboardingTestRunner from "./onboarding-test-runner";
import SocialGenesisTestPanel from "./social-genesis-test-panel";

export default async function TestLabPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");

  const state = await getOnboardingState(parent.id);
  const households = state.householdId
    ? [{ id: state.householdId, label: "Mevcut aile alanı" }]
    : [];
  const childProfiles = state.householdId
    ? state.childProfiles.map((profile) => ({
        id: profile.id,
        householdId: state.householdId as string,
        displayName: profile.displayName,
        ageBand: profile.ageBand,
      }))
    : [];

  return (
    <>
      <OnboardingTestRunner
        households={households}
        childProfiles={childProfiles}
      />
      <DeepOriginTestPanel />
      <GenesisDerivedStagePanel
        phaseId="character_genesis_origin_structure"
        endpoint="/api/settings/test-lab/genesis/origin-structure"
        title="Structured Origin Extraction"
        description="Deep Origin tarafından zaten üretilmiş canonical facts, summary fact lineage, unresolved questions ve story hooks verisini yeni LLM çağrısı yapmadan ayrı bir derived Test Lab phase olarak görünür ve seçilebilir hale getirir."
        actionLabel="Structured origin kanıtını çıkar"
      />
      <CharacterDnaTestPanel />
      <SocialGenesisTestPanel />
      <InventoryGenesisTestPanel />
      <MemoryThreadGenesisTestPanel />
      <EnvironmentGenesisTestPanel />
      <GenesisDerivedStagePanel
        phaseId="character_genesis_validation"
        endpoint="/api/settings/test-lab/genesis/validation"
        title="Genesis Validation"
        description="Tam sandbox Genesis paketini production cross-domain validator ile kontrol eder; eksik section, referans, knowledge-boundary, duplicate identity ve environment uyumsuzluklarını commit öncesi görünür hale getirir."
        actionLabel="Cross-domain validation çalıştır"
      />
      <GenesisDerivedStagePanel
        phaseId="character_genesis_first_story_context"
        endpoint="/api/settings/test-lab/genesis/first-story-context"
        title="First Story Context Preview"
        description="Valid Genesis paketini production first-story Context Assembly yolundan geçirir. Commit yalnız sandbox içinde simüle edilir; canonical production mutation yapılmadan provider-safe context manifest, token budget, findings ve content hash görüntülenir."
        actionLabel="Production first-story context oluştur"
      />
      <GenesisQualificationPanel />
    </>
  );
}
