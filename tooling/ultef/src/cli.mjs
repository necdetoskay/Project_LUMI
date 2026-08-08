import { spawnSync } from 'node:child_process';

const requested = process.argv[2] ?? 'selftest';

const commands = {
  selftest: {
    command: 'node',
    args: ['tooling/ultef/src/selftest.mjs']
  },
  'L1-PROFILE-001': {
    command: 'pnpm',
    args: [
      '--filter',
      '@lumi/profiles',
      'exec',
      'vitest',
      'run',
      '--config',
      'vitest.integration.config.ts',
      'tests/integration/ultef-profile.integration.test.ts'
    ]
  },
  'L3-NPC-001': {
    command: 'pnpm',
    args: [
      '--filter',
      '@lumi/npc-intelligence',
      'exec',
      'vitest',
      'run',
      'tests/ultef/ultef-rumor.test.ts'
    ],
    env: { ULTEF_SCENARIO: 'L3-NPC-001' }
  },
  'L4-OPPORTUNITY-HOOK-001': {
    command: 'pnpm',
    args: [
      '--filter',
      '@lumi/web',
      'exec',
      'vitest',
      'run',
      'tests/ultef-opportunity-to-hook.test.ts'
    ],
    env: { ULTEF_SCENARIO: 'L4-OPPORTUNITY-HOOK-001' }
  },
  'L4-HOOK-SCENE-001': {
    command: 'pnpm',
    args: [
      '--filter',
      '@lumi/story',
      'exec',
      'vitest',
      'run',
      'tests/ultef/ultef-hook-scene.test.ts'
    ],
    env: { ULTEF_SCENARIO: 'L4-HOOK-SCENE-001' }
  },
  L0: { command: 'pnpm', args: ['test'] },
  L1: { command: 'pnpm', args: ['test'] },
  L2: { command: 'pnpm', args: ['--filter', '@lumi/profiles', 'test:int'] },
  L3: { command: 'pnpm', args: ['--filter', '@lumi/npc-intelligence', 'test'] },
  L9: { command: 'pnpm', args: ['--filter', '@lumi/web', 'test:e2e'] }
};

const spec = commands[requested];
if (!spec) {
  console.error(`ULTEF profile '${requested}' is not implemented yet.`);
  console.error(`Available foundation profiles: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}

console.log(`ULTEF foundation runner: ${requested}`);
const result = spawnSync(spec.command, spec.args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ...(spec.env ?? {}) }
});
if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}
process.exit(result.status ?? 2);
