import type { AssetScope } from "../domain/asset";
import type { ObjectStoragePort, StoredObject } from "../ports/storage.port";

export class InMemoryObjectStorage implements ObjectStoragePort {
  readonly providerId = "memory";

  private readonly objects = new Map<string, StoredObject>();
  private readonly accessLog: string[] = [];

  constructor() {}

  get accessLogSnapshot(): string[] {
    return [...this.accessLog];
  }

  async put(
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    this.objects.set(key, {
      key,
      bytes: new Uint8Array(bytes),
      contentType,
      scope: defaultScope(),
      storedAt: new Date(),
    });
    this.accessLog.push(`put:${key}`);
  }

  async putScoped(object: StoredObject): Promise<string> {
    this.objects.set(object.key, object);
    this.accessLog.push(`put:${object.key}`);
    return object.key;
  }

  async get(key: string): Promise<Uint8Array | null> {
    this.accessLog.push(`get:${key}`);
    return this.objects.get(key)?.bytes ?? null;
  }

  async getScoped(
    key: string,
    scope: AssetScope,
  ): Promise<StoredObject | null> {
    this.accessLog.push(`get:${key}`);
    const object = this.objects.get(key);
    if (!object) return null;
    if (object.scope.householdId !== scope.householdId) return null;
    if (object.scope.childProfileId !== scope.childProfileId) return null;
    return object;
  }

  async exists(key: string): Promise<boolean> {
    this.accessLog.push(`exists:${key}`);
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.accessLog.push(`delete:${key}`);
    this.objects.delete(key);
  }

  size(): number {
    return this.objects.size;
  }
}

function defaultScope(): AssetScope {
  return { householdId: "system", childProfileId: "system", worldId: "system" };
}
