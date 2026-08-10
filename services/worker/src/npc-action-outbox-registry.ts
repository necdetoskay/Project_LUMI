import { NpcRelationshipApplicator } from "@lumi/npc-intelligence/application";
import { NpcActionMoveApplicator } from "@lumi/world/application";

import type { WorkerOutboxIntent } from "./outbox-dispatcher";

export type NpcActionIntentType =
  | "npc_action_move_character"
  | "npc_action_set_relationship";

interface NpcOutboxApplicator {
  apply(intent: WorkerOutboxIntent): Promise<{ writes: number }>;
}

export class NpcActionOutboxRegistry {
  private readonly handlers: Record<NpcActionIntentType, NpcOutboxApplicator> =
    {
      npc_action_move_character: new NpcActionMoveApplicator(),
      npc_action_set_relationship: new NpcRelationshipApplicator(),
    };

  supports(intentType: string | undefined): intentType is NpcActionIntentType {
    return (
      intentType === "npc_action_move_character" ||
      intentType === "npc_action_set_relationship"
    );
  }

  async apply(
    intentType: NpcActionIntentType,
    intent: WorkerOutboxIntent,
  ): Promise<{ writes: number }> {
    return this.handlers[intentType].apply(intent);
  }
}
