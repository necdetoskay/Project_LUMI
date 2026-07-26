import type { QueryExecutor } from "../../transaction";
import { answers, reflections } from "../../schema/education";
import type { EducationRepository } from "./education.repository";

export class DrizzleEducationRepository implements EducationRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async addAnswer(input: {
    questionId: string;
    storySessionId: string;
    childProfileId: string;
    answerText?: string;
    answerPayload?: Record<string, unknown>;
  }): Promise<void> {
    await this.executor.insert(answers).values({
      ...input,
      answerPayload: input.answerPayload ?? {},
    });
  }

  async addReflection(input: {
    storySessionId: string;
    childProfileId: string;
    reflectionType?: string;
    text?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await this.executor.insert(reflections).values({
      ...input,
      reflectionType: input.reflectionType ?? "post_story",
      payload: input.payload ?? {},
    });
  }
}
