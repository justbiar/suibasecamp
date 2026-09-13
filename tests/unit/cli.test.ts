import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('starts without credentials, reuses a wallet across processes, and never pipes the secret', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sui-cli-'));
  try {
    const env = {
      ...process.env,
      OPENROUTER_API_KEY: '',
      MEMWAL_ACCOUNT_ID: '',
      MEMWAL_PRIVATE_KEY: '',
      WALLET_FILE: join(dir, 'wallet.json'),
      SUI_NETWORK: 'testnet',
      SUI_GRPC_URL: 'https://fullnode.testnet.sui.io:443',
      SHOW_PRIVATE_KEY_ON_CREATE: 'true',
    };
    const run = () =>
      spawnSync(
        process.execPath,
        ['node_modules/tsx/dist/cli.mjs', 'src/index.ts'],
        {
          env,
          input: '/wallet create\n/exit\n',
          encoding: 'utf8',
          timeout: 10000,
        },
      );
    const first = run();
    expect(first.status).toBe(0);
    const wallet = JSON.parse(await readFile(env.WALLET_FILE, 'utf8')) as {
      address: string;
      secretKey: string;
    };
    expect(first.stdout).toContain(wallet.address);
    expect(first.stdout).toContain('Memory: disabled');
    expect(first.stdout + first.stderr).not.toContain(wallet.secretKey);
    const second = run();
    expect(second.status).toBe(0);
    expect(second.stdout).toContain(wallet.address);
    expect(second.stdout).toContain('"created": false');
    expect(second.stdout + second.stderr).not.toContain(wallet.secretKey);
    const exported = spawnSync(
      process.execPath,
      ['node_modules/tsx/dist/cli.mjs', 'src/index.ts', 'wallet:export'],
      { env, encoding: 'utf8', timeout: 10000 },
    );
    expect(exported.status).toBe(1);
    expect(exported.stdout + exported.stderr).not.toContain(wallet.secretKey);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 20000);

it('continues with memory disabled after invalid delegate initialization', () => {
  const result = spawnSync(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'src/index.ts'],
    {
      env: {
        ...process.env,
        OPENROUTER_API_KEY: '',
        MEMWAL_ACCOUNT_ID: '0x2',
        MEMWAL_PRIVATE_KEY: 'invalid-delegate-format',
      },
      input: '/help\n/exit\n',
      encoding: 'utf8',
      timeout: 10000,
    },
  );
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('could not initialize');
  expect(result.stdout + result.stderr).not.toContain(
    'invalid-delegate-format',
  );
});
