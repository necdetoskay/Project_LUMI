export class SimulationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SimulationError";
  }
}

export class WorldClockError extends SimulationError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "WorldClockError";
  }
}

export class SimulationRunError extends SimulationError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "SimulationRunError";
  }
}

export class EffectCommitError extends SimulationError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "EffectCommitError";
  }
}

export class CrossHouseholdSimulationError extends SimulationError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "CrossHouseholdSimulationError";
  }
}
