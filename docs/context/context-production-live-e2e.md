# Context Production Live E2E

This check is intentionally opt-in because it calls the paid production text-generation gateway.

## Purpose

The deterministic Context Builder golden acceptance remains the primary CI regression suite. The live smoke test adds a narrow provider-boundary check proving that the web story runtime can reach the real OpenRouter-backed shared gateway without introducing a second API-key or HTTP transport path.

## Run

Set:

- `LUMI_LIVE_LLM_E2E=1`
- `OPENROUTER_API_KEY=<server secret>`
- optionally `LUMI_LIVE_LLM_MODEL=<OpenRouter model id>`

Then run the web Vitest target containing `context-live-e2e.test.ts`.

## Cost and CI policy

The test uses a tiny deterministic prompt and a small output budget. It is skipped by default and MUST NOT become a required PR gate unless a dedicated budgeted secret/environment is provisioned.

## Next acceptance layer

The full production E2E should seed a disposable household/profile/world/session/hook in a test database, invoke `generateHookReaderTurn`, then assert the generated scene and Context Inspector snapshot were persisted with the same context hash. That test should use isolated disposable data and explicit cleanup.
