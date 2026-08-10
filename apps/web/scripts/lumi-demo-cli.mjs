import {
  runDemoReset,
  runDemoSeed,
  runDemoStatus,
} from "../../../scripts/demo/lumi-demo-runner.mjs";
import { createLumiDemoPostgresAdapter } from "./lumi-demo-db.mjs";
import { createLumiDemoStoryPostgresAdapter } from "./lumi-demo-story-db.mjs";

const command = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const adapter = createLumiDemoPostgresAdapter(databaseUrl);
const storyAdapter = createLumiDemoStoryPostgresAdapter(databaseUrl);

try {
  let result;
  if (command === "status") {
    const core = await runDemoStatus({ adapter });
    const story = core.exists ? await storyAdapter.inspect() : { ready: false };
    result = { ...core, story };
  } else if (command === "seed") {
    const core = await runDemoSeed({
      databaseUrl,
      adapter,
      nodeEnv: process.env.NODE_ENV,
      confirmation: process.env.LUMI_DEMO_CONFIRM,
    });
    const story = await storyAdapter.ensure();
    result = { core, story };
  } else if (command === "reset") {
    await storyAdapter.reset();
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
  await storyAdapter.close();
  await adapter.close();
}
