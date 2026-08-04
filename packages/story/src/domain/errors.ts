export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ValidationError extends DomainError {
  constructor(
    code: string,
    message: string,
    public readonly field?: string,
  ) {
    super(code, message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, id: string) {
    super("NOT_FOUND", `${entityType} with id ${id} not found`);
    this.name = "NotFoundError";
  }
}

export class AuthorizationError extends DomainError {
  constructor(message = "User is not authorized for this operation") {
    super("FORBIDDEN", message);
    this.name = "AuthorizationError";
  }
}
