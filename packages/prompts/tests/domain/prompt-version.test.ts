import { describe, expect, it } from "vitest";
import { PromptVersion } from "../../src/domain";
import { ValidationError } from "../../src/domain/errors";

describe("PromptVersion", () => {
  function createVersion() {
    return PromptVersion.create({
      registryId: crypto.randomUUID(),
      versionNumber: 1,
      templateBody: "Hello {{name}}",
      variableSchema: [{ name: "name", type: "string", required: true }],
    });
  }

  it("creates a draft version", () => {
    const version = createVersion();
    expect(version.status).toBe("draft");
    expect(version.publishedAt).toBeNull();
    expect(version.archivedAt).toBeNull();
  });

  it("publishes a draft version", () => {
    const version = createVersion();
    version.publish();
    expect(version.status).toBe("published");
    expect(version.publishedAt).toBeInstanceOf(Date);
  });

  it("rejects mutation after publish", () => {
    const version = createVersion();
    version.publish();
    expect(() => version.publish()).toThrow(ValidationError);
    expect(() => version.assertMutable()).toThrow(ValidationError);
  });

  it("archives a published version", () => {
    const version = createVersion();
    version.publish();
    version.archive();
    expect(version.status).toBe("archived");
    expect(version.archivedAt).toBeInstanceOf(Date);
  });

  it("rejects archive from draft", () => {
    const version = createVersion();
    expect(() => version.archive()).toThrow(ValidationError);
  });

  it("rejects re-publishing an archived version", () => {
    const version = createVersion();
    version.publish();
    version.archive();
    expect(() => version.publish()).toThrow(ValidationError);
  });

  it("rejects publish from archived", () => {
    const version = createVersion();
    version.publish();
    version.archive();
    expect(() => version.publish()).toThrow(ValidationError);
  });

  it("rejects invalid version number", () => {
    expect(() =>
      PromptVersion.create({
        registryId: crypto.randomUUID(),
        versionNumber: 0,
        templateBody: "test",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects empty template body", () => {
    expect(() =>
      PromptVersion.create({
        registryId: crypto.randomUUID(),
        versionNumber: 1,
        templateBody: "   ",
      }),
    ).toThrow(ValidationError);
  });
});
