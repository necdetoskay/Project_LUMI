import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleHouseholdRepository } from "../../db/repositories/profile/drizzle-household.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";
import {
  householdMembers,
  parentalSettings,
} from "../../db/schema";
import { executeIdempotently } from "../system/execute-idempotently.use-case";
import { withTransaction } from "../../db/transaction";

export async function createHouseholdService(input: {
  userId: string;
  name: string;
  slug: string;
  idempotencyKey: string;
}) {
  return executeIdempotently({
    scope: "api.households.create",
    key: input.idempotencyKey,
    requestPayload: {
      userId: input.userId,
      name: input.name,
      slug: input.slug,
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    operation: async () => {
      const result = await withTransaction(async (tx) => {
        const householdRepository =
          new DrizzleHouseholdRepository(tx);
        const auditRepository =
          new DrizzleAuditRepository(tx);
        const outboxRepository =
          new DrizzleOutboxRepository(tx);

        const household = await householdRepository.create({
          ownerUserId: input.userId,
          name: input.name,
          slug: input.slug,
        });

        await tx.insert(householdMembers).values({
          householdId: household.id,
          userId: input.userId,
          membershipRole: "owner",
        });

        await tx.insert(parentalSettings).values({
          householdId: household.id,
          contentSafetyLevel: "strict",
          allowImageGeneration: false,
          allowVoiceGeneration: false,
          enableBackgroundSimulation: false,
        });

        await auditRepository.append({
          actorType: "user",
          actorId: input.userId,
          action: "household.created",
          entityType: "household",
          entityId: household.id,
          afterState: {
            name: household.name,
            slug: household.slug,
          },
        });

        await outboxRepository.enqueue({
          aggregateType: "household",
          aggregateId: household.id,
          eventType: "household.created",
          payload: {
            householdId: household.id,
            ownerUserId: input.userId,
          },
        });

        return household;
      });

      return {
        responseCode: 201,
        responseBody: {
          id: result.id,
          name: result.name,
          slug: result.slug,
        },
      };
    },
  });
}
