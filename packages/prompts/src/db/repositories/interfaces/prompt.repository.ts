import type { QueryExecutor } from "../../client";
import type {
  NewPromptRegistryRecord,
  NewPromptVersionRecord,
  PromptActivationRecord,
  PromptRegistryRecord,
  PromptVersionRecord,
} from "../../schema/prompts";

export interface PromptRepository {
  createRegistry(
    tx: { insert: QueryExecutor["insert"] },
    data: NewPromptRegistryRecord,
  ): Promise<PromptRegistryRecord>;

  createVersion(
    tx: { insert: QueryExecutor["insert"] },
    data: NewPromptVersionRecord,
  ): Promise<PromptVersionRecord>;

  publishVersion(
    tx: { update: QueryExecutor["update"] },
    id: string,
  ): Promise<PromptVersionRecord | undefined>;

  activateVersion(
    tx: {
      select: QueryExecutor["select"];
      insert: QueryExecutor["insert"];
      update: QueryExecutor["update"];
    },
    registryId: string,
    versionId: string,
    householdId: string,
  ): Promise<PromptActivationRecord>;

  getActiveVersion(
    tx: { select: QueryExecutor["select"] },
    registryId: string,
  ): Promise<PromptVersionRecord | undefined>;

  getVersionById(
    tx: { select: QueryExecutor["select"] },
    id: string,
  ): Promise<PromptVersionRecord | undefined>;

  listVersionsByRegistry(
    tx: { select: QueryExecutor["select"] },
    registryId: string,
  ): Promise<PromptVersionRecord[]>;
}
