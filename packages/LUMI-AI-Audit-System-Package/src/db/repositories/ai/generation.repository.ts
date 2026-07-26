export interface GenerationRepository {
  createRequest(input: {
    requestType: string;
    subjectType?: string;
    subjectId?: string;
    promptTemplateVersionId?: string;
    requestedModelId?: string;
    inputPayload?: Record<string, unknown>;
  }): Promise<{ id: string }>;
  startAttempt(input: {
    generationRequestId: string;
    modelId: string;
    attemptNumber: number;
  }): Promise<{ id: string }>;
  completeAttempt(input: {
    generationAttemptId: string;
    generationRequestId: string;
    outputPayload: Record<string, unknown>;
    latencyMs?: number;
  }): Promise<void>;
}
