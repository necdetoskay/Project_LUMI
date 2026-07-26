import { and, eq, gt } from "drizzle-orm";
import { createHash } from "node:crypto";
import { idempotencyKeys } from "../../db/schema/system";
import { withSerializableTransaction } from "../../db/transaction";

export async function executeIdempotently<T extends Record<string, unknown>>(input: {
  scope: string;
  key: string;
  requestPayload: Record<string, unknown>;
  expiresAt: Date;
  operation: (tx: any) => Promise<{ responseCode: number; responseBody: T }>;
}): Promise<{ responseCode: number; responseBody: T; replayed: boolean }> {
  const requestHash = createHash("sha256")
    .update(JSON.stringify(input.requestPayload))
    .digest("hex");

  return withSerializableTransaction(async (tx) => {
    const [existing] = await tx.select().from(idempotencyKeys)
      .where(and(
        eq(idempotencyKeys.scope, input.scope),
        eq(idempotencyKeys.key, input.key),
      )).limit(1);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new Error("Idempotency key reused with different payload");
      }
      if (existing.status === "completed") {
        return {
          responseCode: existing.responseCode ?? 200,
          responseBody: existing.responseBody as T,
          replayed: true,
        };
      }
      throw new Error("Idempotent operation is already processing");
    }

    await tx.insert(idempotencyKeys).values({
      scope: input.scope,
      key: input.key,
      requestHash,
      expiresAt: input.expiresAt,
      status: "processing",
    });

    const result = await input.operation(tx);

    await tx.update(idempotencyKeys).set({
      status: "completed",
      responseCode: result.responseCode,
      responseBody: result.responseBody,
      updatedAt: new Date(),
    }).where(and(
      eq(idempotencyKeys.scope, input.scope),
      eq(idempotencyKeys.key, input.key),
    ));

    return { ...result, replayed: false };
  });
}
