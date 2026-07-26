# 09 — Security Standard

**Document ID:** EOS-STD-009  
**Version:** 1.0.0  
**Status:** Approved

## Purpose

Integrate security throughout design, implementation, release, and maintenance.

## Principles

- Security by Design
- Least Privilege
- Defense in Depth
- Secure Defaults
- Continuous Review

## Required Practices

- Never store secrets in repositories.
- Validate and sanitize external inputs.
- Enforce authorization on trusted server-side boundaries.
- Protect sensitive data in transit and at rest where required.
- Review dependencies and known vulnerabilities.
- Log security-relevant events without exposing secrets.
- Define backup, recovery, and incident responsibilities.

## Anti-Patterns

- Hardcoded credentials
- Plaintext password storage
- Client-only authorization
- Excessive permissions
- Logging tokens or personal data unnecessarily
- Ignoring outdated dependencies

## Exit Criteria

Security readiness requires completed controls, documented risks, and no unresolved critical security finding.
