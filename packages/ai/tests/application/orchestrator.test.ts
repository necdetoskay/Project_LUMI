import { describe, expect, it } from "vitest";

import { GenerationOrchestrator } from "../../src/application/orchestrator";
import { ModelRouter } from "../../src/infrastructure/model-router";
import { TestProvider } from "../../src/infrastructure/providers/test-provider";
import { InMemoryUsageRecorder } from "../../src/usage/in-memory-usage-recorder";
import { NoOpValidator } from "../../src/validation/no-op-validator";
import type {
  ComposedPrompt,
  PromptComposerPort,
} from "../../src/ports/prompt-composer.port";
import type { PromptComposerInput } from "../../src/ports/prompt-composer.port";
import type { GenerationValidatorPort } from "../../src/ports/generation-validator.port";
import type {
  GenerationRequest,
  ModelPolicy,
} from "../../src/domain/generation-types";
import type {
  ValidationFinding,
  ValidationReport,
} from "../../src/domain/validation-types";

class StubComposer implements PromptComposerPort {
  public lastInput: PromptComposerInput | null = null;
  public async compose(input: PromptComposerInput): Promise<ComposedPrompt> {
    this.lastInput = input;
    return {
      systemPrompt: "sys",
      prompt: `composed:${input.task}`,
      jsonMode: true,
    };
  }
}

function schemaFinding(code: string, message: string): ValidationFinding {
  return { kind: "schema", code, message, severity: "error" };
}

function invalidReport(findings: ValidationFinding[]): ValidationReport {
  return { valid: false, findings };
}

function validReport(): ValidationReport {
  return { valid: true, findings: [] };
}

const MODEL_POLICY: ModelPolicy = {
  preferredModel: "test-model",
  fallbackModels: [],
  maxAttempts: 3,
  maxRepairs: 1,
  timeoutMs: 5000,
};

function makeRequest(
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest {
  return {
    requestId: "req:orchestrator",
    householdId: "household:1",
    childProfileId: "child:1",
    worldId: "world:1",
    task: "story_scene",
    mode: "static",
    promptKey: "story.scene",
    contextHash: "ctx:abc",
    modelPolicy: MODEL_POLICY,
    variables: { hero: "Luna" },
    seed: "seed:scene",
    ...overrides,
  };
}

function buildOrchestrator(
  provider: TestProvider,
  composer: PromptComposerPort,
  validator = new NoOpValidator(),
) {
  const router = new ModelRouter();
  router.registerProvider(provider);
  const usage = new InMemoryUsageRecorder();
  const orchestrator = new GenerationOrchestrator({
    modelRouter: router,
    promptComposer: composer,
    usageRecorder: usage,
    validator,
  });
  return { orchestrator, usage };
}

describe("GenerationOrchestrator (integration)", () => {
  it("produces an approved response from a valid provider output", async () => {
    const provider = new TestProvider({
      defaultRawResponse: '{"scene":"Once upon a time","hero":"Luna"}',
    });
    const composer = new StubComposer();
    const { orchestrator, usage } = buildOrchestrator(provider, composer);

    const response = await orchestrator.generate(makeRequest());

    expect(response.status).toBe("approved");
    expect(response.output).toEqual({
      scene: "Once upon a time",
      hero: "Luna",
    });
    expect(response.providerId).toBe("test-provider");
    expect(response.modelId).toBe("test-model");
    expect(response.outputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(response.attempts).toHaveLength(1);
    expect(response.attempts[0]?.status).toBe("success");
    expect(composer.lastInput?.task).toBe("story_scene");
    expect(composer.lastInput?.promptKey).toBe("story.scene");

    const records = await usage.recentForRequest("req:orchestrator");
    expect(records).toHaveLength(1);
    expect(records[0]?.outcome).toBe("success");
    expect(records[0]?.totalTokens).toBe(160);
  });

  it("falls back to a second attempt when the provider fails once", async () => {
    const provider = new TestProvider({ defaultRawResponse: '{"ok":true}' });
    provider.scriptRequest("req:fail-once", {
      failWith: "unavailable",
      failTimes: 1,
    });
    const { orchestrator, usage } = buildOrchestrator(
      provider,
      new StubComposer(),
    );

    const response = await orchestrator.generate(
      makeRequest({ requestId: "req:fail-once" }),
    );

    expect(response.status).toBe("approved");
    expect(response.attempts).toHaveLength(2);
    expect(response.attempts[0]?.status).toBe("failure");
    expect(response.attempts[0]?.failureState).toBe("provider_unavailable");
    expect(response.attempts[1]?.status).toBe("success");

    const records = await usage.recentForRequest("req:fail-once");
    expect(records).toHaveLength(2);
    expect(records[0]?.outcome).toBe("success");
    expect(records[1]?.outcome).toBe("failed");
  });

  it("fails cleanly after exhausting all attempts", async () => {
    const provider = new TestProvider({ defaultRawResponse: '{"ok":true}' });
    provider.scriptRequest("req:always-fail", { failWith: "timeout" });
    const { orchestrator } = buildOrchestrator(provider, new StubComposer());

    const response = await orchestrator.generate(
      makeRequest({
        requestId: "req:always-fail",
        modelPolicy: { ...MODEL_POLICY, maxAttempts: 2 },
      }),
    );

    expect(response.status).toBe("failed");
    expect(response.failureState).toBe("provider_timeout");
    expect(response.output).toBeNull();
    expect(response.attempts).toHaveLength(2);
  });

  it("repairs a schema-invalid output up to the repair limit", async () => {
    const provider = new TestProvider({
      defaultRawResponse: '{"scene":"valid one"}',
    });
    const composer = new StubComposer();
    const router = new ModelRouter();
    router.registerProvider(provider);
    const usage = new InMemoryUsageRecorder();

    let invalidCalled = false;
    const flakyValidator: GenerationValidatorPort = {
      async validate() {
        if (!invalidCalled) {
          invalidCalled = true;
          return invalidReport([schemaFinding("SCHEMA-1", "missing hero")]);
        }
        return validReport();
      },
    };

    const orchestrator = new GenerationOrchestrator(
      {
        modelRouter: router,
        promptComposer: composer,
        usageRecorder: usage,
        validator: flakyValidator,
      },
      { maxRepairs: 1 },
    );

    const response = await orchestrator.generate(makeRequest());

    expect(response.status).toBe("approved");
    expect(response.attempts).toHaveLength(2);
    expect(response.attempts[0]?.repaired).toBe(true);
    expect(response.attempts[1]?.repaired).toBe(false);
    expect(response.attempts[0]?.status).toBe("failure");
    expect(response.attempts[1]?.status).toBe("success");
  });

  it("fails when schema errors persist beyond the repair limit", async () => {
    const provider = new TestProvider({
      defaultRawResponse: '{"scene":"invalid"}',
    });
    const composer = new StubComposer();
    const router = new ModelRouter();
    router.registerProvider(provider);
    const usage = new InMemoryUsageRecorder();

    const alwaysInvalidValidator: GenerationValidatorPort = {
      async validate() {
        return invalidReport([schemaFinding("SCHEMA-1", "blocked")]);
      },
    };

    const orchestrator = new GenerationOrchestrator(
      {
        modelRouter: router,
        promptComposer: composer,
        usageRecorder: usage,
        validator: alwaysInvalidValidator,
      },
      { maxRepairs: 1 },
    );

    const response = await orchestrator.generate(
      makeRequest({ modelPolicy: { ...MODEL_POLICY, maxAttempts: 2 } }),
    );

    expect(response.status).toBe("failed");
    expect(response.failureState).toBe("schema_invalid");
    expect(response.output).toBeNull();
  });

  it("returns the same output for the same seed (no duplicate session progression)", async () => {
    const provider = new TestProvider({
      defaultRawResponse: '{"scene":"deterministic"}',
    });
    const composer = new StubComposer();
    const { orchestrator } = buildOrchestrator(provider, composer);

    const first = await orchestrator.generate(
      makeRequest({ requestId: "req:seed-a" }),
    );
    const second = await orchestrator.generate(
      makeRequest({ requestId: "req:seed-b" }),
    );

    expect(first.output).toEqual(second.output);
    expect(first.outputHash).toBe(second.outputHash);
  });
});
