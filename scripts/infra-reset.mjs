import { runCompose } from "./compose.mjs";

if (!process.argv.includes("--confirm")) {
  console.error("Bu işlem yerel veriyi siler. Onay için --confirm kullanın.");
  process.exit(1);
}

runCompose(["down", "--volumes"]);
