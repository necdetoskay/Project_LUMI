export class TestLabInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestLabInvariantError";
  }
}
