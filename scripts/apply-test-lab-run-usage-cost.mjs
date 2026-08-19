import fs from "node:fs";

const path = "apps/web/app/app/settings/test-lab/onboarding-test-runner.tsx";
let source = fs.readFileSync(path, "utf8");

const before = `function formatCost(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  if (value === 0) return "$0.000000";
  if (value < 0.000001) return \`${"${value.toExponential(2)}"}\`;
  return \`${"${value.toFixed(6)}"}\`;
}`;

const after = `function formatCost(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  if (value === 0) return "$0.000000";
  if (value < 0.000001) return "$" + value.toExponential(2);
  return "$" + value.toFixed(6);
}`;

if (!source.includes(before)) {
  throw new Error("Missing expected formatCost block");
}
source = source.replace(before, after);

for (const marker of [
  "actualCostUsd: number | null",
  "Aşama kullanım özeti",
  "Gerçek API",
  "Input {usage.promptTokens} token",
  "Output {usage.completionTokens} token",
]) {
  if (!source.includes(marker)) {
    throw new Error(`Missing usage UI marker: ${marker}`);
  }
}

fs.writeFileSync(path, source);
console.log(`Fixed ${path}`);
