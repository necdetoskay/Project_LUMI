# Security and Privacy Baseline

## Objective

Establish secure defaults before child-related data and generated content are introduced.

## Required controls

- Secrets loaded only from environment or approved secret store.
- `.env*` ignored except sample files.
- Input validated with Zod.
- ORM parameterization used for database queries.
- Safe client errors; detailed server logs.
- Correlation IDs returned without stack traces.
- Protected routes enforce a session check.
- Security headers configured through Next.js.
- Cookies use `httpOnly`, `sameSite=lax` or stricter and `secure` in production.
- No child personal data is included in development seed.
- Audit metadata must reject or redact secret fields.

## Development authentication

A development-only sign-in shortcut may be used when:

- enabled by an explicit environment variable;
- impossible to enable accidentally in production;
- clearly labeled in the UI;
- bound to a seeded adult test user;
- documented as non-production.

## Data minimization

Sprint 01 stores only foundational identity and operational metadata. Do not add names, birth dates, voice recordings, story content, child interests or behavioral profiles.

## Logging exclusions

Never log:

- passwords or tokens;
- full database URLs;
- cookies;
- authorization headers;
- child content;
- raw environment objects.

## Threat checklist

- Broken access control.
- Secret exposure.
- Injection.
- Unsafe error detail.
- Missing rate protection for public endpoints.
- Unbounded health dependency calls.
- Dependency vulnerabilities.
- Misconfigured CORS.
