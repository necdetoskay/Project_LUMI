import { spawnSync } from 'node:child_process';

const requested = process.argv[2] ?? 'selftest';

const commands = {
  selftest: ['node', ['tooling/ultef/src/selftest.mjs']],
  L0: ['pnpm', ['test']],
  L1: ['pnpm', ['test']],
  L2: ['pnpm', ['--filter', '@lumi/profiles', 'test:int']],
  L3: ['pnpm', ['--filter', '@lumi/npc-intelligence', 'test']],
  L9: ['pnpm', ['--filter', '@lumi/web', 'test:e2e']]
};

const command = commands[requested];
if (!command) {
  console.error(`ULTEF profile '${requested}' is not implemented yet.`);
  console.error(`Available foundation profiles: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}

console.log(`ULTEF foundation runner: ${requested}`);
const result = spawnSync(command[0], command[1], { stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}
process.exit(result.status ?? 2);
