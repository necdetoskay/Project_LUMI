# ULTEF Instrumentation Target 001 — Real Profile/Ownership Scenario

Status: READY FOR IMPLEMENTATION
Date: 2026-08-08
Scenario ID: `L1-PROFILE-001`
Primary gate: `PX-LUMI-06`

## Why this scenario first

Before instrumenting the full Golden Journey, ULTEF should prove it can capture evidence from a real LUMI production package with deterministic behavior and no paid provider dependency. The profiles package is the safest first target because ownership/isolation invariants are critical and the package already has unit + integration test infrastructure.

## Scenario intent

Verify that a household/child/character relationship is created and enforced by the real profiles domain/application path, and that cross-household access is rejected.

## Required runtime narrative

The report must describe actual runtime values, for example:

```text
SETUP
- Household A: <actual test id/name>
- Household B: <actual test id/name>
- Child profile: <actual test id/name>
- Character: <actual test id/name>

WHAT HAPPENED
01. Household A created or test fixture initialized.
02. Child profile was associated with Household A.
03. Character was associated with that child profile.
04. Same-household lookup succeeded.
05. Household B attempted to read/use the character.
06. Cross-household lookup/use was rejected.

ASSERTIONS
- character belongs to expected child profile
- child profile belongs to expected household
- same-household access succeeds
- foreign-household access is rejected
```

The values in the real report must be captured from runtime, not copied from this document.

## Minimum evidence

- identifiers or safe synthetic names for both households;
- child profile identifier/safe name;
- character identifier/safe name;
- actual ownership links;
- actual access result for allowed request;
- actual access result/error for denied request;
- assertion expected/actual values;
- no production user PII.

## Result policy

`PASS` requires all ownership/isolation assertions to pass. A missing DB prerequisite for an integration variant must be `BLOCKED`, not treated as a successful skip.

## Implementation approach

Prefer adding a thin ULTEF adapter/helper around an existing profiles test rather than rewriting the profiles behavior. The existing test remains the source of truth; ULTEF adds semantic scenario ID + runtime narrative + artifact emission.

After this scenario produces truthful artifacts, repeat the pattern for `L3-NPC-001`, then connect cross-package flows into L4 and ultimately `L6-GOLDEN-001`.
