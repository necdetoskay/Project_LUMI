# Module Boundaries

## `system` module

Responsibilities:

- version information;
- liveness and readiness;
- startup diagnostics;
- public technical status.

May depend on configuration, logging and database health ports.

## `identity` module

Sprint 01 responsibilities:

- user identity representation;
- household ownership baseline;
- development session boundary;
- protected route authorization check.

Not responsible for full registration, password reset, social login or child profile management.

## `audit` module

Responsibilities:

- append-only audit record;
- action naming;
- actor and target references;
- correlation metadata;
- safe structured metadata.

## Shared infrastructure

`lib/config`: typed environment access.  
`lib/db`: ORM client and transaction helper.  
`lib/logging`: structured logger and request context.  
`lib/errors`: common error hierarchy and mapping.  
`lib/validation`: reusable Zod helpers.

## Forbidden dependencies

- UI components must not import ORM.
- Audit module must not depend on UI.
- Identity domain must not depend on Next.js request objects.
- Route handlers must not construct database queries directly.
- Tests must not require hidden developer machines or cloud credentials.
