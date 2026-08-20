import {
  getOriginThreadPlanningWeight,
  isCharacterVisibleThread,
  isOpenOriginThread,
  type GenesisMemorySeed,
  type GenesisOriginThread,
  type MemoryThreadGenesisManifest,
} from "../domain/memory-thread-genesis";

export interface CharacterVisibleMemoryThreadContext {
  memories: GenesisMemorySeed[];
  threads: Array<
    Pick<
      GenesisOriginThread,
      "candidateId" | "key" | "summary" | "status" | "originFactIds"
    >
  >;
}

export interface PlannerMemoryThreadContext {
  memories: GenesisMemorySeed[];
  threads: Array<{
    thread: GenesisOriginThread;
    planningWeight: number;
  }>;
}

export interface MemoryThreadContextProjection {
  characterVisible: CharacterVisibleMemoryThreadContext;
  planner: PlannerMemoryThreadContext;
}

export function projectMemoryThreadGenesisContext(
  manifest: MemoryThreadGenesisManifest,
  recentThreadIds: readonly string[] = [],
): MemoryThreadContextProjection {
  const characterVisibleThreads = manifest.threads
    .filter(isOpenOriginThread)
    .filter(isCharacterVisibleThread)
    .map((thread) => ({
      candidateId: thread.candidateId,
      key: thread.key,
      summary: thread.summary,
      status: thread.status,
      originFactIds: [...thread.originFactIds],
    }));

  const plannerThreads = manifest.threads
    .filter(isOpenOriginThread)
    .map((thread) => ({
      thread: structuredClone(thread),
      planningWeight: getOriginThreadPlanningWeight(thread, recentThreadIds),
    }))
    .filter((entry) => entry.planningWeight > 0)
    .sort(
      (left, right) =>
        right.planningWeight - left.planningWeight ||
        left.thread.candidateId.localeCompare(right.thread.candidateId),
    );

  return {
    characterVisible: {
      memories: structuredClone(manifest.memories),
      threads: characterVisibleThreads,
    },
    planner: {
      memories: structuredClone(manifest.memories),
      threads: plannerThreads,
    },
  };
}
