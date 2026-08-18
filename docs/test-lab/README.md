# Test Lab Canonical UI

The visual implementation source of truth for `/app/settings/test-lab` is `canonical-ui-v1.json` together with the approved Test Lab dashboard mockup.

Rules:
- do not reorder canonical desktop sections;
- do not expose raw IDs/JSON/debug controls in the default dashboard;
- keep the existing technical Test Lab surface under `/app/settings/test-lab/advanced`;
- do not start data-binding phases until UI-1 passes browser screenshot comparison at 1672×941;
- visual acceptance is required in addition to normal CI/build checks.

Tracked by #334 and UI-1 issue #335. UI-1 implementation is PR #340.
