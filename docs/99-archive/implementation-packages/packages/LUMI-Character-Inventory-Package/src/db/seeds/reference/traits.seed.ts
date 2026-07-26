import { db } from "../../client";
import { traitDefinitions } from "../../schema/character";

const data = [
  ["courage", "Cesaret"],
  ["kindness", "Nezaket"],
  ["curiosity", "Merak"],
  ["patience", "Sabır"],
  ["honesty", "Dürüstlük"],
  ["empathy", "Empati"],
  ["creativity", "Yaratıcılık"],
  ["responsibility", "Sorumluluk"],
  ["cooperation", "İş Birliği"],
  ["caution", "Tedbir"],
] as const;

export async function seedTraits(): Promise<void> {
  await db.insert(traitDefinitions)
    .values(data.map(([code, name]) => ({ code, name })))
    .onConflictDoNothing({ target: traitDefinitions.code });
}
