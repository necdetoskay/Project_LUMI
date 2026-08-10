import {
  runDemoReset,
  runDemoSeed,
  runDemoStatus,
} from "../../../scripts/demo/lumi-demo-runner.mjs";
import { createLumiDemoPostgresAdapter } from "./lumi-demo-db.mjs";

const command = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const adapter = createLumiDemoPostgresAdapter(databaseUrl);

try {
  let result;
  if (command === "status") {
    result = await runDemoStatus({ adapter });
  } else if (command === "seed") {
    result = await runDemoSeed({
      databaseUrl,
      adapter,
      nodeEnv: process.env.NODE_ENV,
      confirmation: process.env.LUMI_DEMO_CONFIRM,
    });
  } else if (command === "reset") {
    result = await runDemoReset({
      databaseUrl,
      adapter,
      nodeEnv: process.env.NODE_ENV,
      confirmation: process.env.LUMI_DEMO_CONFIRM,
    });
  } else {
    throw new Error("Usage: lumi-demo-cli.mjs <status|seed|reset>");
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  await adapter.close();
}
