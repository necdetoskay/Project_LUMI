import type {
  OriginBatchProposal,
  OriginGenerationInput,
  OriginGenerationResult,
  OriginPackageProposal,
} from "../domain/origin-types";

export interface OriginGeneratorPort {
  generate(input: OriginGenerationInput): Promise<OriginGenerationResult>;
  parseProposal(content: string): Promise<OriginPackageProposal | null>;
  parseBatch(content: string): Promise<OriginBatchProposal | null>;
}
