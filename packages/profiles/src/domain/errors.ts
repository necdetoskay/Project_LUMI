export class DomainError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  public readonly field: string | undefined;

  constructor(code: string, message: string, field?: string) {
    super(code, message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, id: string) {
    super("NOT_FOUND", `${entityType} with id '${id}' not found`);
    this.name = "NotFoundError";
  }
}

export class AuthorizationError extends DomainError {
  constructor(message: string) {
    super("FORBIDDEN", message);
    this.name = "AuthorizationError";
  }
}
