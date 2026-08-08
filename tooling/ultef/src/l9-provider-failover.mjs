const CHAMPION = "openai/gpt-4.1-mini";
const FALLBACK = "google/gemini-2.5-flash";

const retryableFaults = new Set(["timeout", "429", "5xx", "malformed"]);

function validateStoryOutput(output) {
  if (!output || typeof output !== "object") return false;
  if (typeof output.narrative !== "string" || output.narrative.trim().length < 20)
    return false;
  return (
    output.childSafety === true &&
    output.worldBoundary === true &&
    output.continuity === true &&
    output.structuredContract === true
  );
}

async function routeWithFallback({ championCall, fallbackCall }) {
  const attempts = [];

  try {
    const champion = await championCall();
    attempts.push({ model: CHAMPION, result: "response" });
    if (validateStoryOutput(champion)) {
      return { model: CHAMPION, output: champion, attempts };
    }
    attempts[attempts.length - 1].result = "validation_failed";
  } catch (error) {
    const kind = error?.kind ?? "unknown";
    attempts.push({ model: CHAMPION, result: kind });
    if (!retryableFaults.has(kind)) throw error;
  }

  const fallback = await fallbackCall();
  attempts.push({ model: FALLBACK, result: "response" });
  if (!validateStoryOutput(fallback)) {
    attempts[attempts.length - 1].result = "validation_failed";
    throw Object.assign(new Error("FALLBACK_VALIDATION_FAILED"), {
      kind: "validation_failed",
      attempts,
    });
  }

  return { model: FALLBACK, output: fallback, attempts };
}

function validOutput(label) {
  return {
    narrative: `${label}: Arin onceki secimini hatirladi ve guvenli rotadan Mira'ya dondu.`,
    childSafety: true,
    worldBoundary: true,
    continuity: true,
    structuredContract: true,
  };
}

function fault(kind) {
  return async () => {
    throw Object.assign(new Error(`injected:${kind}`), { kind });
  };
}

const cases = [
  ["timeout", fault("timeout")],
  ["429", fault("429")],
  ["5xx", fault("5xx")],
  ["malformed", async () => ({ narrative: "x" })],
];

for (const [name, championCall] of cases) {
  const routed = await routeWithFallback({
    championCall,
    fallbackCall: async () => validOutput(`fallback-${name}`),
  });
  if (routed.model !== FALLBACK) {
    throw new Error(`${name}: expected eligible fallback route`);
  }
  if (routed.attempts.length !== 2) {
    throw new Error(`${name}: expected exactly two attempts`);
  }
}

const championSuccess = await routeWithFallback({
  championCall: async () => validOutput("champion-success"),
  fallbackCall: async () => {
    throw new Error("fallback must not run after valid champion output");
  },
});
if (championSuccess.model !== CHAMPION || championSuccess.attempts.length !== 1) {
  throw new Error("valid champion response should be accepted without fallback");
}

let unsafeFallbackRejected = false;
try {
  await routeWithFallback({
    championCall: fault("timeout"),
    fallbackCall: async () => ({
      ...validOutput("unsafe-fallback"),
      childSafety: false,
    }),
  });
} catch (error) {
  unsafeFallbackRejected = error?.message === "FALLBACK_VALIDATION_FAILED";
}
if (!unsafeFallbackRejected) {
  throw new Error("unsafe fallback output must never bypass deterministic validation");
}

let nonRetryableRejected = false;
try {
  await routeWithFallback({
    championCall: fault("auth"),
    fallbackCall: async () => validOutput("must-not-run"),
  });
} catch (error) {
  nonRetryableRejected = error?.kind === "auth";
}
if (!nonRetryableRejected) {
  throw new Error("non-retryable provider faults must not silently fail over");
}

console.log("L9-PROVIDER-FAILOVER-001: PASS");
console.log(`Champion: ${CHAMPION}`);
console.log(`Eligible fallback: ${FALLBACK}`);
console.log("Faults covered: timeout, 429, 5xx, malformed output");
console.log("Unsafe fallback validation bypass: rejected");
console.log("Provider cost: 0");
