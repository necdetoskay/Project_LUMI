import type { CharacterRecord, NewCharacterRecord } from "../../schema/character";

export interface CharacterRepository {
  findById(id: string): Promise<CharacterRecord | null>;
  create(input: NewCharacterRecord): Promise<CharacterRecord>;
  setTrait(input: {
    characterId: string;
    traitDefinitionId: string;
    value: number;
    confidence?: number;
  }): Promise<void>;
}
