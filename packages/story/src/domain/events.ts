import type { StoryEventType } from "./story-types";

export interface StoryDomainEvent {
  id: string;
  storyId: string;
  eventType: StoryEventType;
  eventVersion: number;
  aggregateVersion: number;
  actorHouseholdId: string;
  childProfileId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export function createStoryEvent(
  storyId: string,
  childProfileId: string,
  actorHouseholdId: string,
  eventType: StoryEventType,
  aggregateVersion: number,
  additionalPayload: Record<string, unknown> = {},
): StoryDomainEvent {
  return {
    id: crypto.randomUUID(),
    storyId,
    eventType,
    eventVersion: 1,
    aggregateVersion,
    actorHouseholdId,
    childProfileId,
    payload: {
      ...additionalPayload,
      eventType,
    },
    createdAt: new Date(),
  };
}
