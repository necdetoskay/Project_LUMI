import { spawnSync } from "node:child_process";

export function runCompose(arguments_) {
  const result = spawnSync(
    "docker",
    ["compose", "--file", "infra/compose/docker-compose.yml", ...arguments_],
    { stdio: "inherit", shell: process.platform === "win32" },
  );

  if (result.error) {
    console.error("Docker Compose çalıştırılamadı:", result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}
