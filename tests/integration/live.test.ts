import 'dotenv/config';
import { it, expect } from 'vitest';
import { parseEnv } from '../../src/config/env.js';
import { createSui } from '../../src/clients/sui.js';
import { createMemory, bounded } from '../../src/clients/memwal.js';
const live = process.env.RUN_LIVE_TESTS === 'true';
it.skipIf(!live)(
  'reads live Sui Testnet balance',
  async () => {
    const c = parseEnv({
      ...process.env,
      SUI_NETWORK: 'testnet',
      SUI_GRPC_URL: 'https://fullnode.testnet.sui.io:443',
    });
    const sui = createSui(c);
    const { balance } = await sui.getBalance({
      owner: '0x' + '0'.repeat(63) + '2',
      signal: AbortSignal.timeout(15000),
    });
    expect(balance.balance).toMatch(/^\d+$/);
  },
  20000,
);
it.skipIf(!live)(
  'resolves a nonexistent Testnet SuiNS name cleanly',
  async () => {
    const sui = createSui(parseEnv({}));
    const { address } = await sui.resolveNameServiceAddress({
      name: 'missing-local-agent-' + Date.now() + '.sui',
      signal: AbortSignal.timeout(15000),
    });
    expect(address).toBeNull();
  },
  20000,
);
it.skipIf(
  !live || !process.env.MEMWAL_ACCOUNT_ID || !process.env.MEMWAL_PRIVATE_KEY,
)(
  'checks live MemWal health',
  async () => {
    const mem = createMemory(parseEnv(process.env));
    expect(mem).toBeDefined();
    await bounded(mem!.health(), 15000);
  },
  20000,
);
// Writes require a second explicit opt-in. CI never enables it by default.
it.skipIf(!live || process.env.RUN_MEMORY_WRITE_TESTS !== 'true')(
  'persists and recalls through independently created clients',
  async () => {
    const config = parseEnv(process.env);
    const writer = createMemory(config);
    if (!writer)
      throw new Error('Configure MemWal credentials for write tests.');
    const marker = 'Smoke ' + crypto.randomUUID();
    const job = await bounded(
      writer.remember(marker + ': maximum spending preference is 5 SUI.'),
      20000,
    );
    await bounded(
      writer.waitForRememberJob(job.job_id, { timeoutMs: 60000 }),
      65000,
    );
    const reader = createMemory(config)!;
    const recall = await bounded(
      reader.recall({ query: marker, limit: 5 }),
      20000,
    );
    expect(recall.results.some((m) => m.text.includes(marker))).toBe(true);
  },
  110000,
);
