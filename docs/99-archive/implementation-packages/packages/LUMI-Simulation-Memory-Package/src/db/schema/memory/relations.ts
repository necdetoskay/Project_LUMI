import { relations } from "drizzle-orm";
import { memories } from "./memories";
import { memorySubjects } from "./memory-subjects";
import { memoryLinks } from "./memory-links";
import { memoryRelevance } from "./memory-relevance";
import { memoryEmbeddings } from "./memory-embeddings";

export const memoriesRelations = relations(memories, ({ many }) => ({
  subjects: many(memorySubjects),
  outgoingLinks: many(memoryLinks, { relationName: "memory_link_source" }),
  incomingLinks: many(memoryLinks, { relationName: "memory_link_target" }),
  relevanceEntries: many(memoryRelevance),
  embeddings: many(memoryEmbeddings),
}));
