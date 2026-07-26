import { eq } from "drizzle-orm";
import type { QueryExecutor } from "../../transaction";
import { generationAttempts, generationRequests } from "../../schema/ai";
import type { GenerationRepository } from "./generation.repository";

export class DrizzleGenerationRepository implements GenerationRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async createRequest(input: {
    requestType: string;
    subjectType?: string;
    subjectId?: string;
    promptTemplateVersionId?: string;
    requestedModelId?: string;
    inputPayload?: Record<string, unknown>;
  }) {
    const [record] = await this.executor.insert(generationRequests).values({
      ...input,
      inputPayload: input.inputPayload ?? {},
    }).returning({ id: generationRequests.id });
    if (!record) throw new Error("Generation request creation returned no record");
    return record;
  }

  async startAttempt(input: {
    generationRequestId: string;
    modelId: string;
    attemptNumber: number;
  }) {
    const [record] = await this.executor.insert(generationAttempts).values(input)
      .returning({ id: generationAttempts.id });
    if (!record) throw new Error("Generation attempt creation returned no record");
    return record;
  }

  async completeAttempt(input: {
    generationAttemptId: string;
    generationRequestId: string;
    outputPayload: Record<string, unknown>;
    latencyMs?: number;
  }): Promise<void> {
    await this.executor.update(generationAttempts).set({
      status: "completed",
      completedAt: new Date(),
      latencyMs: input.latencyMs,
    }).where(eq(generationAttempts.id, input.generationAttemptId));

    await this.executor.update(generationRequests).set({
      status: "completed",
      completedAt: new Date(),
      outputPayload: input.outputPayload,
      updatedAt: new Date(),
    }).where(eq(generationRequests.id, input.generationRequestId));
  }
}
