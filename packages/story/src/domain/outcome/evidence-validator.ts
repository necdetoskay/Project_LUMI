import { ValidationError } from "../errors";
import type { StoryContextSnapshot } from "./story-context-snapshot";
import type { OutcomeManifest, OutcomeOperation } from "./outcome-manifest";

/**
 * Validates that each outcome change is traceable to evidence and consistent
 * with the pre-story context snapshot. A change whose target entity is missing
 * from the snapshot, or whose operation is incompatible with the current
 * entity state, is rejected before any world commit happens.
 */

/** Which operations require the target field to already exist in the snapshot. */
const FIELD_REQUIRING_OPERATIONS: ReadonlyArray<OutcomeOperation> = [
  "increment",
  "remove",
  "transfer",
];

export class EvidenceValidator {
  /**
   * @returns a list of validation errors (empty = valid). The caller decides
   * whether to reject the manifest or downgrade to a safe subset.
   */
  validate(
    manifest: OutcomeManifest,
    snapshot: StoryContextSnapshot,
  ): string[] {
    const errors: string[] = [];
    const byId = new Map(
      snapshot.entities.map((e) => [e.entityId, e] as const),
    );

    for (const change of manifest.changes) {
      // 1. Every change must have an evidence reference.
      if (!change.evidenceRef) {
        errors.push(
          `change ${change.key}: missing evidenceRef (cannot validate claim)`,
        );
        continue;
      }

      // 2. Target entity must exist in the snapshot.
      const entity = byId.get(change.entityId);
      if (!entity) {
        errors.push(
          `change ${change.key}: entity ${change.entityId} not found in pre-story snapshot`,
        );
        continue;
      }

      // 3. Operations that mutate an existing value require that field present.
      if (FIELD_REQUIRING_OPERATIONS.includes(change.operation)) {
        const path = change.field.split(".");
        let cursor: unknown = entity.state;
        let exists = true;
        for (const segment of path) {
          if (
            cursor === null ||
            typeof cursor !== "object" ||
            !(segment in (cursor as Record<string, unknown>))
          ) {
            exists = false;
            break;
          }
          cursor = (cursor as Record<string, unknown>)[segment];
        }
        if (!exists) {
          errors.push(
            `change ${change.key}: field "${change.field}" missing on entity ${change.entityId} in snapshot`,
          );
        }
      }
    }

    return errors;
  }
}

export class EvidenceValidationFailedError extends ValidationError {
  constructor(
    readonly detail: readonly string[],
    readonly manifestId: string,
  ) {
    super(
      "EVIDENCE_VALIDATION_FAILED",
      `Outcome manifest ${manifestId} failed evidence validation: ${detail.join("; ")}`,
    );
  }
}
