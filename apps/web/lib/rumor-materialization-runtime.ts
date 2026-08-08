import {
  IndirectEffectPropagator,
  RumorSpreadApplicator,
} from "@lumi/story/application";
import {
  BeliefService,
  RumorBeliefWriterService,
} from "@lumi/npc-intelligence/application";
import { DrizzleBeliefSourceRepository } from "@lumi/npc-intelligence/db";

/**
 * Production composition boundary for story indirect rumor effects.
 * Story stays package-safe and receives only its writer port; the web
 * composition root wires the concrete NPC intelligence persistence adapter.
 */
export function createRumorMaterializationRuntime(options?: {
  beliefRepository?: DrizzleBeliefSourceRepository;
}) {
  const repository =
    options?.beliefRepository ?? new DrizzleBeliefSourceRepository();
  const beliefService = new BeliefService(repository);
  const writer = new RumorBeliefWriterService(beliefService);
  const applicator = new RumorSpreadApplicator(writer);
  return new IndirectEffectPropagator(applicator);
}
