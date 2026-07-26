import { and, asc, eq, lte, sql } from "drizzle-orm";
import { outboxEvents } from "../../db/schema";
import { withTransaction } from "../../db/transaction";

export type OutboxEventHandler = (
  event: typeof outboxEvents.$inferSelect,
) => Promise<void>;

export class OutboxWorker {
  constructor(
    private readonly handlers: Record<
      string,
      OutboxEventHandler
    >,
    private readonly batchSize = 20,
  ) {}

  async runOnce(): Promise<number> {
    const events = await withTransaction(
      async (tx) => {
        const rows = await tx
          .select()
          .from(outboxEvents)
          .where(
            and(
              eq(outboxEvents.status, "pending"),
              lte(
                outboxEvents.availableAt,
                new Date(),
              ),
            ),
          )
          .orderBy(
            asc(outboxEvents.availableAt),
          )
          .limit(this.batchSize)
          .for("update", {
            skipLocked: true,
          });

        for (const event of rows) {
          await tx
            .update(outboxEvents)
            .set({
              status: "publishing",
              attempts: sql`${outboxEvents.attempts} + 1`,
            })
            .where(
              eq(outboxEvents.id, event.id),
            );
        }

        return rows;
      },
    );

    for (const event of events) {
      const handler =
        this.handlers[event.eventType];

      if (!handler) {
        await this.markFailed(
          event.id,
          "No handler registered",
        );
        continue;
      }

      try {
        await handler(event);
        await this.markPublished(event.id);
      } catch (error) {
        await this.markFailed(
          event.id,
          error instanceof Error
            ? error.message
            : "Unknown handler error",
        );
      }
    }

    return events.length;
  }

  private async markPublished(
    eventId: string,
  ): Promise<void> {
    await withTransaction(async (tx) => {
      await tx
        .update(outboxEvents)
        .set({
          status: "published",
          publishedAt: new Date(),
        })
        .where(eq(outboxEvents.id, eventId));
    });
  }

  private async markFailed(
    eventId: string,
    message: string,
  ): Promise<void> {
    await withTransaction(async (tx) => {
      await tx
        .update(outboxEvents)
        .set({
          status: "failed",
          lastError: { message },
          availableAt: new Date(
            Date.now() + 60_000,
          ),
        })
        .where(eq(outboxEvents.id, eventId));
    });
  }
}
