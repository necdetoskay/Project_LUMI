import { and, eq, isNull } from "drizzle-orm";
import type { QueryExecutor } from "../../transaction";
import { characterTraits, characters, type CharacterRecord, type NewCharacterRecord } from "../../schema/character";
import type { CharacterRepository } from "./character.repository";

export class DrizzleCharacterRepository implements CharacterRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async findById(id: string): Promise<CharacterRecord | null> {
    const [record] = await this.executor.select().from(characters)
      .where(and(eq(characters.id, id), isNull(characters.deletedAt))).limit(1);
    return record ?? null;
  }

  async create(input: NewCharacterRecord): Promise<CharacterRecord> {
    const [record] = await this.executor.insert(characters).values(input).returning();
    if (!record) throw new Error("Character creation returned no record");
    return record;
  }

  async setTrait(input: {
    characterId: string;
    traitDefinitionId: string;
    value: number;
    confidence?: number;
  }): Promise<void> {
    await this.executor.insert(characterTraits).values({
      characterId: input.characterId,
      traitDefinitionId: input.traitDefinitionId,
      value: input.value,
      confidence: input.confidence ?? 0.5,
    }).onConflictDoUpdate({
      target: [characterTraits.characterId, characterTraits.traitDefinitionId],
      set: {
        value: input.value,
        confidence: input.confidence ?? 0.5,
        updatedAt: new Date(),
      },
    });
  }
}
