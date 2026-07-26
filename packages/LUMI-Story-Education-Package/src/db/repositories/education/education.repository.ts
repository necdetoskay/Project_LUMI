export interface EducationRepository {
  addAnswer(input: {
    questionId: string;
    storySessionId: string;
    childProfileId: string;
    answerText?: string;
    answerPayload?: Record<string, unknown>;
  }): Promise<void>;
  addReflection(input: {
    storySessionId: string;
    childProfileId: string;
    reflectionType?: string;
    text?: string;
    payload?: Record<string, unknown>;
  }): Promise<void>;
}
