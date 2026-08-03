import { describe, expect, it } from "vitest";

import { GenerationOrchestrator } from "../../src/application/orchestrator";
import { ModelRouter } from "../../src/infrastructure/model-router";
import { TestProvider } from "../../src/infrastructure/providers/test-provider";
import { InMemoryUsageRecorder } from "../../src/usage/in-memory-usage-recorder";
import { PipelineValidator } from "../../src/validation/pipeline-validator";
import type {
  PromptComposerPort,
  ComposedPrompt,
} from "../../src/ports/prompt-composer.port";
import type { PromptComposerInput } from "../../src/ports/prompt-composer.port";
import type {
  GenerationRequest,
  ModelPolicy,
} from "../../src/domain/generation-types";

class StaticComposer implements PromptComposerPort {
  public async compose(input: PromptComposerInput): Promise<ComposedPrompt> {
    void input;
    return { systemPrompt: "sys", prompt: "composed", jsonMode: true };
  }
}

const POLICY: ModelPolicy = {
  preferredModel: "test-model",
  fallbackModels: [],
  maxAttempts: 3,
  maxRepairs: 0,
  timeoutMs: 5000,
};

function request(
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest {
  return {
    requestId: "req:regression",
    householdId: "household:1",
    childProfileId: "child:1",
    worldId: "world:1",
    task: "story_scene",
    mode: "static",
    promptKey: "story.scene",
    contextHash: "ctx:reg",
    modelPolicy: POLICY,
    variables: {},
    seed: "seed:reg",
    ...overrides,
  };
}

function build(validator: PipelineValidator, provider: TestProvider) {
  const router = new ModelRouter();
  router.registerProvider(provider);
  const usage = new InMemoryUsageRecorder();
  const orchestrator = new GenerationOrchestrator({
    modelRouter: router,
    promptComposer: new StaticComposer(),
    usageRecorder: usage,
    validator,
  });
  return { orchestrator, usage };
}

describe("Safety regression", () => {
  it("never surfaces unsafe provider output regardless of repair budget", async () => {
    const provider = new TestProvider({
      defaultRawResponse: JSON.stringify({
        sceneId: "scene:unsafe",
        setting: "the basement",
        characters: ["Luna"],
        narrative: "A weapon was found under the stairs.",
        moment: "It was terrifying.",
        nextPrompt: "Run away?",
      }),
    });
    const { orchestrator } = build(new PipelineValidator(), provider);

    const response = await orchestrator.generate(
      request({ requestId: "req:unsafe" }),
    );

    expect(response.status).toBe("failed");
    expect(response.failureState).toBe("schema_invalid");
    expect(response.output).toBeNull();
  });

  it("keeps session progression deterministic and deduplicated for identical seeds", async () => {
    const provider = new TestProvider({
      defaultRawResponse: JSON.stringify({
        sceneId: "scene:ok",
        setting: "the whispering willow",
        characters: ["Luna"],
        narrative: "Luna found a glowing acorn and followed it home.",
        moment: "The acorn glowed.",
        nextPrompt: "What next?",
      }),
    });
    const { orchestrator } = build(new PipelineValidator(), provider);

    const first = await orchestrator.generate(
      request({ requestId: "req:dup-a" }),
    );
    const second = await orchestrator.generate(
      request({ requestId: "req:dup-b" }),
    );

    expect(first.status).toBe("approved");
    expect(second.status).toBe("approved");
    expect(first.output).toEqual(second.output);
    expect(first.outputHash).toBe(second.outputHash);
  });

  it("writes cost/token/latency records without exposing story text", async () => {
    const provider = new TestProvider({
      defaultRawResponse: JSON.stringify({
        sceneId: "scene:cost",
        setting: "the meadow",
        characters: ["Luna"],
        narrative: "A butterfly landed on Luna's hand.",
        moment: "Wings fluttered.",
        nextPrompt: "Follow it?",
      }),
    });
    const { orchestrator, usage } = build(new PipelineValidator(), provider);

    const response = await orchestrator.generate(
      request({ requestId: "req:cost" }),
    );
    expect(response.status).toBe("approved");

    const records = await usage.recentForRequest("req:cost");
    expect(records.length).toBeGreaterThanOrEqual(1);
    const record = records[0];
    expect(record?.totalTokens).toBeGreaterThan(0);
    expect(record?.latencyMs).toBeGreaterThanOrEqual(0);
    expect(record?.costUsd).toBeGreaterThanOrEqual(0);
    expect(record?.childContent).toBe(true);
    expect(JSON.stringify(record)).not.toContain("butterfly");
    expect(JSON.stringify(record)).not.toContain("meadow");
  });
});
