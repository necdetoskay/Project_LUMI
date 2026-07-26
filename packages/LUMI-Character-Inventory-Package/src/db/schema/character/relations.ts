import { relations } from "drizzle-orm";
import { characters } from "./characters";
import { characterTraits } from "./character-traits";
import { characterEmotions } from "./character-emotions";
import { relationships } from "./relationships";
import { relationshipValues } from "./relationship-values";
import { characterGoals } from "./character-goals";
import { characterConditions } from "./character-conditions";

export const charactersRelations = relations(characters, ({ many }) => ({
  traits: many(characterTraits),
  emotions: many(characterEmotions),
  outgoingRelationships: many(relationships, { relationName: "relationship_source" }),
  incomingRelationships: many(relationships, { relationName: "relationship_target" }),
  goals: many(characterGoals),
  conditions: many(characterConditions),
}));

export const relationshipsRelations = relations(relationships, ({ one, many }) => ({
  source: one(characters, {
    fields: [relationships.sourceCharacterId],
    references: [characters.id],
    relationName: "relationship_source",
  }),
  target: one(characters, {
    fields: [relationships.targetCharacterId],
    references: [characters.id],
    relationName: "relationship_target",
  }),
  values: many(relationshipValues),
}));
