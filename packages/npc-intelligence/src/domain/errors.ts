export class NpcIntelligenceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NpcIntelligenceError";
    this.code = code;
  }
}

export class InformationAccessError extends NpcIntelligenceError {
  constructor(message: string) {
    super("INFORMATION_ACCESS_DENIED", message);
    this.name = "InformationAccessError";
  }
}

export class CrossFamilyAccessError extends NpcIntelligenceError {
  constructor(message: string) {
    super("CROSS_FAMILY_ACCESS_DENIED", message);
    this.name = "CrossFamilyAccessError";
  }
}

export class InvalidWeightPolicyError extends NpcIntelligenceError {
  constructor(message: string) {
    super("INVALID_WEIGHT_POLICY", message);
    this.name = "InvalidWeightPolicyError";
  }
}

export class SelectionFailedError extends NpcIntelligenceError {
  constructor(message: string) {
    super("SELECTION_FAILED", message);
    this.name = "SelectionFailedError";
  }
}
