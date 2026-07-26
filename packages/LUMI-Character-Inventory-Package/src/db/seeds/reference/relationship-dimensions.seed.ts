import { db } from "../../client";
import { relationshipDimensions } from "../../schema/character";

const data = [
  ["trust", "Güven"],
  ["affection", "Sevgi"],
  ["respect", "Saygı"],
  ["fear", "Korku"],
  ["rivalry", "Rekabet"],
  ["familiarity", "Aşinalık"],
  ["gratitude", "Minnettarlık"],
  ["dependency", "Bağımlılık"],
] as const;

export async function seedRelationshipDimensions(): Promise<void> {
  await db.insert(relationshipDimensions)
    .values(data.map(([code, name]) => ({ code, name })))
    .onConflictDoNothing({ target: relationshipDimensions.code });
}
