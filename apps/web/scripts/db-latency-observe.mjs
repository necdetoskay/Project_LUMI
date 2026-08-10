import { performance } from "node:perf_hooks";
import pg from "pg";

const pooledUrl = process.env.DATABASE_URL;
const directUrl = process.env.DATABASE_DIRECT_URL ?? pooledUrl;

if (!pooledUrl || !directUrl) {
  console.error("DATABASE_URL and DATABASE_DIRECT_URL are required.");
  process.exit(1);
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return {
    minMs: Number(sorted[0].toFixed(1)),
    avgMs: Number(average.toFixed(1)),
    p95Ms: Number(sorted[p95Index].toFixed(1)),
    maxMs: Number(sorted.at(-1).toFixed(1)),
  };
}

async function observe(label, connectionString) {
  const connectAndQuery = [];
  for (let index = 0; index < 5; index += 1) {
    const startedAt = performance.now();
    const client = new pg.Client({ connectionString });
    await client.connect();
    await client.query("select 1 as ok");
    await client.end();
    connectAndQuery.push(performance.now() - startedAt);
  }

  const warmQuery = [];
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    for (let index = 0; index < 10; index += 1) {
      const startedAt = performance.now();
      await client.query("select 1 as ok");
      warmQuery.push(performance.now() - startedAt);
    }
  } finally {
    await client.end();
  }

  return {
    label,
    connectAndQuery: stats(connectAndQuery),
    warmQuery: stats(warmQuery),
  };
}

const observations = [
  await observe("pooled-runtime", pooledUrl),
  await observe("direct-admin", directUrl),
];

console.warn("Managed PostgreSQL latency observation (informational, not a performance gate)");
console.warn(JSON.stringify(observations, null, 2));

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  const rows = observations
    .map(
      (entry) =>
        `| ${entry.label} | ${entry.connectAndQuery.avgMs} | ${entry.connectAndQuery.p95Ms} | ${entry.warmQuery.avgMs} | ${entry.warmQuery.p95Ms} |`,
    )
    .join("\n");
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `\n## Neon latency observation\n\nInformational only; GitHub-hosted runner geography is not production geography.\n\n| endpoint | connect+query avg ms | connect+query p95 ms | warm query avg ms | warm query p95 ms |\n|---|---:|---:|---:|---:|\n${rows}\n`,
  );
}
