export type AuthenticatedUser = {
  id: string;
  email: string;
  roles: string[];
};

export type AuthContext = {
  user: AuthenticatedUser;
  requestId: string;
};

export class AuthenticationError extends Error {
  readonly code = "UNAUTHENTICATED";
  readonly status = 401;

  constructor(message = "Oturum doğrulanamadı.") {
    super(message);
  }
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";
  readonly status = 403;

  constructor(message = "Bu işlem için yetkiniz bulunmuyor.") {
    super(message);
  }
}
