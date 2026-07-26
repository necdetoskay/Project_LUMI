import { db } from "../../client";
import { emotionDefinitions } from "../../schema/character";

const data = [
  ["joy", "Neşe"],
  ["sadness", "Üzüntü"],
  ["fear", "Korku"],
  ["anger", "Öfke"],
  ["surprise", "Şaşkınlık"],
  ["curiosity", "Merak"],
  ["hope", "Umut"],
  ["trust", "Güven"],
  ["embarrassment", "Mahcubiyet"],
  ["gratitude", "Minnettarlık"],
] as const;

export async function seedEmotions(): Promise<void> {
  await db.insert(emotionDefinitions)
    .values(data.map(([code, name]) => ({ code, name })))
    .onConflictDoNothing({ target: emotionDefinitions.code });
}
