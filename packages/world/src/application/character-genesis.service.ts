import {
  markCharacterGenesisCommitted,
  selectCharacterGenesisPackage,
  validateCharacterGenesisStructure,
  type CharacterGenesisPackage,
  type CreateCharacterGenesisPackageInput,
  type GenesisValidationResult,
} from "../domain/character-genesis";
import { createCharacterGenesisPackage } from "../domain/character-genesis";
import {
  validateCharacterGenesisCrossDomain,
  type CharacterGenesisCrossDomainValidationContext,
} from "../domain/character-genesis-cross-domain";

export interface CharacterGenesisRepositoryPort {
  save(candidate: CharacterGenesisPackage): Promise<void>;
  getById(candidateId: string): Promise<CharacterGenesisPackage | null>;
  listByCharacter(characterId: string): Promise<CharacterGenesisPackage[]>;
  selectExclusive(
    characterId: string,
    selected: CharacterGenesisPackage,
  ): Promise<void>;
  markCommitted(candidate: CharacterGenesisPackage): Promise<void>;
}

export interface CharacterGenesisCanonicalCommitResult {
  worldId?: string;
  regionId?: string;
  locationId?: string;
  homeId?: string;
  npcIds?: string[];
  itemIds?: string[];
  memoryIds?: string[];
  threadIds?: string[];
}

export interface CharacterGenesisCanonicalCommitRequest {
  candidate: CharacterGenesisPackage;
  idempotencyKey: string;
}

export interface CharacterGenesisCanonicalCommitPort {
  commit(
    request: CharacterGenesisCanonicalCommitRequest,
  ): Promise<CharacterGenesisCanonicalCommitResult>;
}

export interface CharacterGenesisValidationContextPort {
  resolve(
    candidate: CharacterGenesisPackage,
  ):
    | Promise<CharacterGenesisCrossDomainValidationContext>
    | CharacterGenesisCrossDomainValidationContext;
}

export interface CommitCharacterGenesisResult {
  candidate: CharacterGenesisPackage;
  canonical: CharacterGenesisCanonicalCommitResult;
  validation: GenesisValidationResult;
}

export class CharacterGenesisCoordinator {
  constructor(
    private readonly repository: CharacterGenesisRepositoryPort,
    private readonly canonicalCommitter: CharacterGenesisCanonicalCommitPort,
    private readonly validationContext?: CharacterGenesisValidationContextPort,
  ) {}

  async stage(
    input: CreateCharacterGenesisPackageInput,
  ): Promise<CharacterGenesisPackage> {
    const candidate = createCharacterGenesisPackage(input);
    await this.repository.save(candidate);
    return candidate;
  }

  async select(candidateId: string): Promise<CharacterGenesisPackage> {
    const candidate = await this.requireCandidate(candidateId);
    const selected = selectCharacterGenesisPackage(candidate);

    await this.repository.selectExclusive(candidate.characterId, selected);
    return selected;
  }

  async commit(candidateId: string): Promise<CommitCharacterGenesisResult> {
    const candidate = await this.requireCandidate(candidateId);

    if (candidate.status !== "selected") {
      throw new Error("Only the selected genesis package can be committed");
    }

    const siblings = await this.repository.listByCharacter(
      candidate.characterId,
    );
    const selectedSiblings = siblings.filter(
      (entry) => entry.status === "selected",
    );
    if (
      selectedSiblings.length !== 1 ||
      selectedSiblings[0]?.id !== candidate.id
    ) {
      throw new Error(
        "Genesis commit requires exactly one selected candidate for the character",
      );
    }

    const resolvedContext = this.validationContext
      ? await this.validationContext.resolve(structuredClone(candidate))
      : {};
    const validation = validateCharacterGenesisCrossDomain(candidate, {
      ...resolvedContext,
      requireCompletePackage: true,
      requireSelectedForCommit: true,
    });
    if (!validation.valid) {
      throw new CharacterGenesisValidationError(validation);
    }

    const canonical = await this.canonicalCommitter.commit({
      candidate: structuredClone(candidate),
      idempotencyKey: characterGenesisCommitIdempotencyKey(candidate),
    });
    const committed = markCharacterGenesisCommitted(candidate);
    await this.repository.markCommitted(committed);

    return {
      candidate: committed,
      canonical,
      validation,
    };
  }

  async inspect(candidateId: string): Promise<{
    candidate: CharacterGenesisPackage;
    validation: GenesisValidationResult;
  }> {
    const candidate = await this.requireCandidate(candidateId);
    const resolvedContext = this.validationContext
      ? await this.validationContext.resolve(structuredClone(candidate))
      : {};
    return {
      candidate,
      validation: validateCharacterGenesisCrossDomain(candidate, {
        ...resolvedContext,
        requireCompletePackage: false,
      }),
    };
  }

  /** Structural-only inspection remains available for staged partial packages. */
  async inspectStructure(candidateId: string): Promise<{
    candidate: CharacterGenesisPackage;
    validation: GenesisValidationResult;
  }> {
    const candidate = await this.requireCandidate(candidateId);
    return {
      candidate,
      validation: validateCharacterGenesisStructure(candidate),
    };
  }

  private async requireCandidate(
    candidateId: string,
  ): Promise<CharacterGenesisPackage> {
    const candidate = await this.repository.getById(candidateId);
    if (!candidate) {
      throw new Error(`Character genesis candidate ${candidateId} not found`);
    }
    return candidate;
  }
}

export function characterGenesisCommitIdempotencyKey(
  candidate: Pick<CharacterGenesisPackage, "id">,
): string {
  return `character-genesis:${candidate.id}`;
}

export class CharacterGenesisValidationError extends Error {
  constructor(public readonly validation: GenesisValidationResult) {
    super("Character genesis package failed cross-domain validation");
    this.name = "CharacterGenesisValidationError";
  }
}
