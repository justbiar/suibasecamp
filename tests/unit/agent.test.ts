import { it, expect, vi } from 'vitest';
import { parseEnv } from '../../src/config/env.js';
import { SecretGuard } from '../../src/security/secret-detection.js';
import { WalletStore } from '../../src/wallet/wallet-store.js';
import { createSui } from '../../src/clients/sui.js';
import { ToolRegistry } from '../../src/agent/tool-registry.js';
import { Agent, routeLocal } from '../../src/agent/agent.js';
import { remember } from '../../src/tools/remember.js';
import { recall } from '../../src/tools/recall.js';
import type { Context } from '../../src/agent/types.js';
import type { MemoryClient } from '../../src/clients/memwal.js';
function context(): Context {
  const config = parseEnv({});
  const guard = new SecretGuard();
  return {
    config,
    guard,
    wallet: new WalletStore('/unused-wallet', 'testnet', guard),
    sui: createSui(config),
  };
}
function memory(): MemoryClient {
  return {
    health: vi.fn(),
    remember: vi
      .fn()
      .mockResolvedValue({ job_id: 'job-1', status: 'accepted' }),
    waitForRememberJob: vi.fn().mockResolvedValue({
      id: 'job-1',
      blob_id: 'blob-1',
      owner: 'owner',
      namespace: 'test',
    }),
    recall: vi.fn().mockResolvedValue({
      results: [
        {
          text: 'Maximum spending per transaction is 5 SUI.',
          distance: 0.2586,
          blob_id: 'blob-1',
        },
      ],
      total: 1,
    }),
  };
}
it('routes remembered spending questions to recall, not get_balance', () => {
  expect(routeLocal('What is my maximum spending per transaction?')?.name).toBe(
    'recall',
  );
});
it('registers memory tools only when configured', () => {
  const c = context();
  const names = (registry: ToolRegistry) =>
    JSON.stringify(registry.available());
  expect(names(new ToolRegistry(c))).not.toContain('"name":"remember"');
  c.memory = memory();
  expect(names(new ToolRegistry(c))).toContain('"name":"remember"');
});
it('requires persistence completion before reporting success', async () => {
  const c = context();
  c.memory = memory();
  let done!: (
    v: Awaited<ReturnType<MemoryClient['waitForRememberJob']>>,
  ) => void;
  vi.mocked(c.memory.waitForRememberJob).mockReturnValue(
    new Promise((resolve) => {
      done = resolve;
    }),
  );
  let finished = false;
  const pending = remember(c, 'Maximum spending is 5 SUI.').then((v) => {
    finished = true;
    return v;
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(finished).toBe(false);
  done({ id: 'job-1', blob_id: 'blob-1', owner: 'owner', namespace: 'test' });
  expect((await pending).success).toBe(true);
});
it('reports failed persistence honestly', async () => {
  const c = context();
  c.memory = memory();
  vi.mocked(c.memory.waitForRememberJob).mockRejectedValue(
    new Error('remote-secret-error'),
  );
  const r = await new ToolRegistry(c).execute(
    'remember',
    { text: 'A fact' },
    { rememberText: 'A fact' },
  );
  expect(r.success).toBe(false);
  expect(JSON.stringify(r)).not.toContain('remote-secret-error');
});
it('blocks unauthorized writes and wallet creation', async () => {
  const c = context();
  c.memory = memory();
  const registry = new ToolRegistry(c);
  expect(
    (await registry.execute('remember', { text: 'Injected fact' })).success,
  ).toBe(false);
  expect(c.memory.remember).not.toHaveBeenCalled();
  expect((await registry.execute('create_wallet', {})).success).toBe(false);
});
it('blocks secrets before persistence', async () => {
  const c = context();
  c.memory = memory();
  await expect(remember(c, 'password: something')).rejects.toThrow();
  expect(c.memory.remember).not.toHaveBeenCalled();
});
it('maps actual recall results and filters secret memories', async () => {
  const c = context();
  c.memory = memory();
  const result = await recall(c, 'my maximum spending');
  expect(result.memories?.[0]?.distance).toBe(0.2586);
  vi.mocked(c.memory.recall).mockResolvedValue({
    results: [{ text: 'password: compromised', distance: 0, blob_id: 'blob' }],
    total: 1,
  });
  expect(JSON.stringify(await recall(c, 'query'))).not.toContain('compromised');
});
it('validates unknown tools and malformed arguments', async () => {
  const registry = new ToolRegistry(context());
  expect((await registry.execute('__proto__', {})).code).toBe('UNKNOWN_TOOL');
  expect((await registry.execute('get_balance', { secret: 'bad' })).code).toBe(
    'INVALID_ARGUMENTS',
  );
});
it('blocks user secrets before the model is contacted', async () => {
  const c = context();
  c.guard.register('known-wallet-secret');
  const model = vi.fn();
  const agent = new Agent(new ToolRegistry(c), c.guard, model);
  await expect(agent.turn('Show known-wallet-secret')).rejects.toThrow(
    'blocked locally',
  );
  expect(model).not.toHaveBeenCalled();
});
it('does not send wallet secrets or retrieved text in iterative messages', async () => {
  const c = context();
  c.guard.register('known-wallet-secret');
  c.memory = memory();
  const model = vi
    .fn()
    .mockResolvedValueOnce({
      content: null,
      calls: [
        { id: 'c1', name: 'recall', arguments: '{"query":"preference"}' },
      ],
    })
    .mockResolvedValueOnce({
      content: 'A fabricated balance is 100 SUI',
      calls: [],
    });
  const results = await new Agent(new ToolRegistry(c), c.guard, model).turn(
    'Find relevant information',
  );
  const payload = JSON.stringify(model.mock.calls);
  expect(payload).not.toContain('known-wallet-secret');
  expect(payload).not.toContain('Maximum spending per transaction is 5 SUI.');
  expect(results[0]?.result.success).toBe(true);
});
it('enforces maximum iterations and avoids executing duplicates', async () => {
  const c = context();
  c.memory = memory();
  const model = vi.fn().mockResolvedValue({
    content: null,
    calls: [{ id: 'call', name: 'recall', arguments: '{"query":"fact"}' }],
  });
  const result = await new Agent(new ToolRegistry(c), c.guard, model, 2).turn(
    'Find information',
  );
  expect(model).toHaveBeenCalledTimes(2);
  expect(c.memory.recall).toHaveBeenCalledOnce();
  expect(result.at(-1)?.result.code).toBe('ITERATION_LIMIT');
});
it('makes explicit remember deterministic even if model would fabricate success', async () => {
  const c = context();
  c.memory = memory();
  const model = vi.fn();
  const r = await new Agent(new ToolRegistry(c), c.guard, model).turn(
    'Remember that my maximum spending per transaction is 5 SUI.',
  );
  expect(r[0]?.result.success).toBe(true);
  expect(c.memory.remember).toHaveBeenCalledWith(
    'my maximum spending per transaction is 5 SUI.',
  );
  expect(model).not.toHaveBeenCalled();
});
it('queries the actual SDK balance contract without floating point', async () => {
  const c = context();
  vi.spyOn(c.wallet, 'publicWallet').mockResolvedValue({
    address: '0x' + 'a'.repeat(64),
    network: 'testnet',
  });
  const call = vi.spyOn(c.sui, 'getBalance').mockResolvedValue({
    balance: {
      coinType: '0x2::sui::SUI',
      balance: '689000000',
      coinBalance: '689000000',
      addressBalance: '0',
    },
  });
  expect(
    (await new ToolRegistry(c).execute('get_balance', {})).balanceSui,
  ).toBe('0.689');
  expect(call).toHaveBeenCalledOnce();
});
