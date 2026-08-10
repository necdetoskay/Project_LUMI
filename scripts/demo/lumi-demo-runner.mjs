import {
  LUMI_DEMO_MANIFEST,
  LUMI_DEMO_MANIFEST_VERSION,
  validateLumiDemoManifest,
} from "./lumi-demo-manifest.mjs";

export const LUMI_DEMO_CONFIRMATION = LUMI_DEMO_MANIFEST_VERSION;

const SAFE_DATABASE_MARKERS = ["dev", "local", "test", "demo", "review"];

function databaseName(databaseUrl) {
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, "").split("?")[0] ?? "";
  } catch {
    throw new Error("DEMO_DATABASE_URL_INVALID");
  }
}

export function assertDemoDatabaseSafety({
  databaseUrl,
  nodeEnv = process.env.NODE_ENV,
  confirmation = process.env.LUMI_DEMO_CONFIRM,
  allowedDatabaseName = process.env.LUMI_DEMO_ALLOWED_DATABASE_NAME,
}) {
  if (!databaseUrl) throw new Error("DEMO_DATABASE_URL_REQUIRED");
  if (nodeEnv === "production")
    throw new Error("DEMO_PRODUCTION_ENV_FORBIDDEN");

  const name = databaseName(databaseUrl).toLowerCase();
  const markerSafe = SAFE_DATABASE_MARKERS.some((marker) => name.includes(marker));
  const exactNameConfirmed =
    typeof allowedDatabaseName === "string" &&
    allowedDatabaseName.trim().toLowerCase() === name &&
    name.length > 0;

  if (!markerSafe && !exactNameConfirmed) {
    throw new Error(`DEMO_DATABASE_NOT_DISPOSABLE:${name || "unknown"}`);
  }
  if (confirmation !== LUMI_DEMO_CONFIRMATION) {
    throw new Error(`DEMO_CONFIRMATION_REQUIRED:${LUMI_DEMO_CONFIRMATION}`);
  }

  return Object.freeze({
    databaseName: name,
    safe: true,
    safetyMode: markerSafe ? "marker" : "exact-name-confirmation",
  });
}

function assertAdapter(adapter) {
  for (const method of ["inspect", "seed", "reset"]) {
    if (typeof adapter?.[method] !== "function") {
      throw new Error(`DEMO_ADAPTER_MISSING:${method}`);
    }
  }
}

function assertManifest(manifest) {
  const result = validateLumiDemoManifest(manifest);
  if (!result.ok) {
    throw new Error(`DEMO_MANIFEST_INVALID:${result.errors.join("|")}`);
  }
}

function assertCanonicalIdentity(status, manifest) {
  if (!status.exists) return;
  if (status.householdId !== manifest.household.id) {
    throw new Error("DEMO_SCOPE_IDENTITY_MISMATCH");
  }
  if (status.householdKey !== manifest.household.key) {
    throw new Error("DEMO_SCOPE_KEY_MISMATCH");
  }
}

export async function runDemoStatus({
  adapter,
  manifest = LUMI_DEMO_MANIFEST,
}) {
  assertAdapter(adapter);
  assertManifest(manifest);
  const status = await adapter.inspect(manifest);
  assertCanonicalIdentity(status, manifest);
  return Object.freeze({
    ...status,
    manifestVersion: manifest.manifestVersion,
  });
}

export async function runDemoSeed({
  databaseUrl,
  adapter,
  manifest = LUMI_DEMO_MANIFEST,
  nodeEnv,
  confirmation,
}) {
  assertDemoDatabaseSafety({ databaseUrl, nodeEnv, confirmation });
  assertAdapter(adapter);
  assertManifest(manifest);

  const status = await adapter.inspect(manifest);
  assertCanonicalIdentity(status, manifest);

  if (status.exists) {
    if (status.manifestVersion !== manifest.manifestVersion) {
      throw new Error("DEMO_RESET_REQUIRED_FOR_VERSION_CHANGE");
    }
    return Object.freeze({ outcome: "already_seeded", status });
  }

  const seeded = await adapter.seed(manifest);
  const after = await adapter.inspect(manifest);
  assertCanonicalIdentity(after, manifest);
  if (!after.exists || after.manifestVersion !== manifest.manifestVersion) {
    throw new Error("DEMO_SEED_POSTCONDITION_FAILED");
  }

  return Object.freeze({ outcome: "seeded", result: seeded, status: after });
}

export async function runDemoReset({
  databaseUrl,
  adapter,
  manifest = LUMI_DEMO_MANIFEST,
  nodeEnv,
  confirmation,
}) {
  assertDemoDatabaseSafety({ databaseUrl, nodeEnv, confirmation });
  assertAdapter(adapter);
  assertManifest(manifest);

  const status = await adapter.inspect(manifest);
  assertCanonicalIdentity(status, manifest);
  if (!status.exists) {
    return Object.freeze({ outcome: "already_absent", status });
  }

  const result = await adapter.reset(manifest);
  const after = await adapter.inspect(manifest);
  if (after.exists) throw new Error("DEMO_RESET_POSTCONDITION_FAILED");

  return Object.freeze({ outcome: "reset", result, status: after });
}
