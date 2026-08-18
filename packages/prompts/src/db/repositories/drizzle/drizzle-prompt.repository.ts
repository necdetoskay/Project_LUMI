import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import type {
  NewPromptActivationHistoryRecord,
  NewPromptActivationRecord,
  NewPromptRegistryRecord,
  NewPromptVersionRecord,
} from "../../schema/prompts";
import {
  promptActivationHistory,
  promptActivations,
  promptRegistries,
  promptVersions,
} from "../../schema/prompts";
import type { PromptRepository } from "../interfaces/prompt.repository";

export class DrizzlePromptRepository implements PromptRepository {
  async createRegistry(
    tx: { insert: QueryExecutor["insert"] },
    data: NewPromptRegistryRecord,
  ) {
    const [row] = await tx.insert(promptRegistries).values(data).returning();
    return row!;
  }

  async createVersion(
    tx: { insert: QueryExecutor["insert"] },
    data: NewPromptVersionRecord,
  ) {
    const [row] = await tx.insert(promptVersions).values(data).returning();
    return row!;
  }

  async publishVersion(tx: { update: QueryExecutor["update"] }, id: string) {
    const [row] = await tx
      .update(promptVersions)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(promptVersions.id, id))
      .returning();
    return row;
  }

  async activateVersion(
    tx: {
      select: QueryExecutor["select"];
      insert: QueryExecutor["insert"];
      update: QueryExecutor["update"];
    },
    registryId: string,
    versionId: string,
    householdId: string,
  ) {
    const activeRows = await tx
      .select()
      .from(promptActivations)
      .where(
        and(
          eq(promptActivations.registryId, registryId),
          isNull(promptActivations.deactivatedAt),
        ),
      );

    const previousActive = activeRows[0];
    const previousVersionId = previousActive?.activeVersionId ?? null;

    if (previousActive) {
      await tx
        .update(promptActivations)
        .set({ deactivatedAt: new Date() })
        .where(eq(promptActivations.id, previousActive.id));
    }

    const activationRecord: NewPromptActivationRecord = {
      registryId,
      activeVersionId: versionId,
      householdId,
      activatedAt: new Date(),
      deactivatedAt: undefined,
    };

    const [activation] = await tx
      .insert(promptActivations)
      .values(activationRecord)
      .returning();

    const historyRecord: NewPromptActivationHistoryRecord = {
      registryId,
      fromVersionId: previousVersionId,
      toVersionId: versionId,
      householdId,
      changedAt: new Date(),
    };

    await tx.insert(promptActivationHistory).values(historyRecord);

    return activation!;
  }

  async getRegistryByKey(
    tx: { select: QueryExecutor["select"] },
    householdId: string,
    promptKey: string,
  ) {
    const [row] = await tx
      .select()
      .from(promptRegistries)
      .where(
        and(
          eq(promptRegistries.householdId, householdId),
          eq(promptRegistries.promptKey, promptKey),
        ),
      )
      .limit(1);
    return row;
  }

  async getActiveVersion(
    tx: { select: QueryExecutor["select"] },
    registryId: string,
  ) {
    const [activation] = await tx
      .select()
      .from(promptActivations)
      .where(
        and(
          eq(promptActivations.registryId, registryId),
          isNull(promptActivations.deactivatedAt),
        ),
      )
      .limit(1);

    if (!activation) {
      return undefined;
    }

    const [version] = await tx
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.id, activation.activeVersionId))
      .limit(1);

    return version;
  }

  async getVersionById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.id, id))
      .limit(1);
    return row;
  }

  async listVersionsByRegistry(
    tx: { select: QueryExecutor["select"] },
    registryId: string,
  ) {
    return tx
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.registryId, registryId))
      .orderBy(promptVersions.versionNumber);
  }
}
