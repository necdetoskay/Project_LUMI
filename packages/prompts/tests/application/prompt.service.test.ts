import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  activatePromptVersion,
  createPromptRegistry,
  createPromptVersion,
  getActivePromptVersion,
  publishPromptVersion,
  renderActivePrompt,
  __setTestPromptDb,
  __setTestPromptRepository,
} from "../../src/application/prompt.service";
import type { Database } from "../../src/db/client";
import type { PromptRepository } from "../../src/db/repositories/interfaces/prompt.repository";
import { ValidationError } from "../../src/domain/errors";
import type { PromptVariableDefinition } from "../../src/domain/prompt-variable";

describe("PromptService", () => {
  const householdId = crypto.randomUUID();
  const registryId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const now = new Date();

  const variables: PromptVariableDefinition[] = [
    { name: "childName", type: "string", required: true },
  ];

  const mockDb = {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  } as unknown as Database;

  function publishedVersionRecord() {
    return {
      id: versionId,
      registryId,
      versionNumber: 1,
      status: "published" as const,
      templateBody: "Hello {{childName}}",
      variableSchema: variables,
      modelPreferences: {},
      outputSchema: {},
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      archivedAt: null,
    };
  }

  const mockRepo: PromptRepository = {
    createRegistry: vi.fn(async (_tx, data) => ({
      ...data,
      id: registryId,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    })),
    createVersion: vi.fn(async (_tx, data) => ({
      ...data,
      id: versionId,
      status: "draft" as const,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      publishedAt: null,
      archivedAt: null,
    })),
    publishVersion: vi.fn(async (_tx, id) => ({
      ...publishedVersionRecord(),
      id,
    })),
    activateVersion: vi.fn(async () => ({
      id: "activation-id",
      registryId,
      activeVersionId: versionId,
      householdId,
      activatedAt: now,
      deactivatedAt: null,
    })),
    getActiveVersion: vi.fn(async () => publishedVersionRecord()),
    getVersionById: vi.fn(async () => publishedVersionRecord()),
    listVersionsByRegistry: vi.fn(async () => []),
  };

  beforeEach(() => {
    __setTestPromptDb(mockDb);
    __setTestPromptRepository(mockRepo);
    vi.clearAllMocks();
  });

  it("creates a registry", async () => {
    const result = await createPromptRegistry({
      householdId,
      promptKey: "story.test",
      purpose: "test",
    });
    expect(result.promptKey).toBe("story.test");
    expect(mockRepo.createRegistry).toHaveBeenCalledTimes(1);
  });

  it("creates a version", async () => {
    const result = await createPromptVersion({
      registryId,
      versionNumber: 1,
      templateBody: "Hello {{childName}}",
      variableSchema: variables,
    });
    expect(result.registryId).toBe(registryId);
    expect(result.status).toBe("draft");
  });

  it("publishes a version", async () => {
    vi.mocked(mockRepo.getVersionById).mockResolvedValueOnce({
      ...publishedVersionRecord(),
      status: "draft",
      publishedAt: null,
    });
    const result = await publishPromptVersion(versionId);
    expect(result!.status).toBe("published");
    expect(mockRepo.publishVersion).toHaveBeenCalledWith(
      expect.anything(),
      versionId,
    );
  });

  it("rejects publishing an already published version", async () => {
    vi.mocked(mockRepo.getVersionById).mockResolvedValueOnce(
      publishedVersionRecord(),
    );
    await expect(publishPromptVersion(versionId)).rejects.toThrow(
      ValidationError,
    );
  });

  it("activates a published version", async () => {
    const result = await activatePromptVersion(
      registryId,
      versionId,
      householdId,
    );
    expect(result.activeVersionId).toBe(versionId);
    expect(mockRepo.activateVersion).toHaveBeenCalledWith(
      expect.anything(),
      registryId,
      versionId,
      householdId,
    );
  });

  it("rejects activating a draft version", async () => {
    vi.mocked(mockRepo.getVersionById).mockResolvedValueOnce({
      ...publishedVersionRecord(),
      status: "draft",
      publishedAt: null,
    });
    await expect(
      activatePromptVersion(registryId, versionId, householdId),
    ).rejects.toThrow(ValidationError);
  });

  it("gets the active version", async () => {
    const result = await getActivePromptVersion(registryId);
    expect(result?.id).toBe(versionId);
  });

  it("renders the active prompt", async () => {
    const result = await renderActivePrompt(registryId, { childName: "Ada" });
    expect(result.renderedText).toBe("Hello Ada");
    expect(result.versionId).toBe(versionId);
  });

  it("throws when rendering active prompt with missing variable", async () => {
    await expect(renderActivePrompt(registryId, {})).rejects.toThrow(
      ValidationError,
    );
  });
});
