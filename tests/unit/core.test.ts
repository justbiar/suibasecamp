import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm, stat, writeFile, chmod, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from '../../src/config/env.js';
import { SecretGuard } from '../../src/security/secret-detection.js';
import { WalletStore } from '../../src/wallet/wallet-store.js';
import { mistToSui } from '../../src/output/authoritative-data.js';
import { renderTurn } from '../../src/output/formatter.js';
import { defaultIdentity } from '../../src/clients/suins.js';
import { createMemory } from '../../src/clients/memwal.js';
import { createSui } from '../../src/clients/sui.js';
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function store() {
  const dir = await mkdtemp(join(tmpdir(), 'sui-agent-'));
  dirs.push(dir);
  const guard = new SecretGuard();
  const reveal = vi.fn();
  return {
    wallet: new WalletStore(join(dir, 'wallet.json'), 'testnet', guard, reveal),
    guard,
    reveal,
    dir,
  };
}
describe('configuration', () => {
  it('defaults to Testnet without credentials', () => {
    const c = parseEnv({});
    expect(c.SUI_NETWORK).toBe('testnet');
    expect(c.SUI_GRPC_URL).toBe('https://fullnode.testnet.sui.io:443');
    expect(createMemory(c)).toBeUndefined();
  });
  it('rejects incomplete memory configuration without echoing values', () => {
    expect(() => parseEnv({ MEMWAL_PRIVATE_KEY: 'sensitive-value' })).toThrow(
      'Set both',
    );
    expect(() =>
      parseEnv({ MEMWAL_PRIVATE_KEY: 'sensitive-value' }),
    ).not.toThrow('sensitive-value');
  });
  it.each([
    '[https://example.com](https://example.com)',
    'http://example.com',
    'https://user:password@example.com',
  ])('rejects unsafe URLs %s', (url) => {
    expect(() => parseEnv({ SUI_GRPC_URL: url })).toThrow();
  });
  it('rejects mismatched networks and invalid boolean', () => {
    expect(() =>
      parseEnv({
        SUI_NETWORK: 'mainnet',
        SUI_GRPC_URL: 'https://fullnode.testnet.sui.io:443',
      }),
    ).toThrow();
    expect(() => parseEnv({ SHOW_PRIVATE_KEY_ON_CREATE: 'yes' })).toThrow();
  });
  it('uses mainnet only by explicit configuration', () => {
    expect(parseEnv({ SUI_NETWORK: 'mainnet' }).SUI_GRPC_URL).toContain(
      'mainnet',
    );
  });
});
describe('wallet isolation', () => {
  it('creates real keys, reuses existing wallet, and only reveals once', async () => {
    const { wallet, guard, reveal, dir } = await store();
    const first = await wallet.create();
    const second = await wallet.create();
    expect(first.address).toMatch(/^0x[a-f0-9]{64}$/);
    expect(second.address).toBe(first.address);
    expect(second.created).toBe(false);
    expect(reveal).toHaveBeenCalledOnce();
    expect(JSON.stringify(first)).not.toContain('secretKey');
    const key = reveal.mock.calls[0]?.[0] as string;
    expect(guard.contains(key)).toBe(true);
    expect((await stat(join(dir, 'wallet.json'))).mode & 0o777).toBe(0o600);
  });
  it('does not replace a corrupt existing wallet', async () => {
    const { wallet, dir } = await store();
    await writeFile(join(dir, 'wallet.json'), 'broken', { mode: 0o600 });
    await expect(wallet.create()).rejects.toThrow();
  });
  it('rejects network reuse', async () => {
    const { wallet, dir, guard } = await store();
    await wallet.create();
    await expect(
      new WalletStore(
        join(dir, 'wallet.json'),
        'mainnet',
        guard,
      ).publicWallet(),
    ).rejects.toThrow('network');
  });
  it('rejects publicly readable files and symlinks', async () => {
    const { wallet, dir } = await store();
    await wallet.create();
    await chmod(join(dir, 'wallet.json'), 0o644);
    await expect(wallet.publicWallet()).rejects.toThrow('permissions');
    await symlink(join(dir, 'wallet.json'), join(dir, 'link.json'));
    await expect(
      new WalletStore(
        join(dir, 'link.json'),
        'testnet',
        new SecretGuard(),
      ).publicWallet(),
    ).rejects.toThrow();
  });
});
describe('secret guards', () => {
  it.each([
    'suiprivkey1' + 'q'.repeat(60),
    'sk-or-v1-' + 'a'.repeat(50),
    'password: hunter-example',
    'Bearer token-example',
    'abandon '.repeat(11) + 'about',
    'f'.repeat(64),
  ])('rejects secret form %#', (text) => {
    expect(new SecretGuard().contains(text)).toBe(true);
  });
  it('redacts exact known credentials', () => {
    const g = new SecretGuard();
    g.register('local-sensitive-value');
    expect(g.redact('Oops local-sensitive-value')).toBe('Oops [REDACTED]');
  });
  it('accepts preferences and public addresses', () => {
    expect(
      new SecretGuard().contains('Maximum spending per transaction is 5 SUI.'),
    ).toBe(false);
    expect(new SecretGuard().contains('0x' + 'a'.repeat(64))).toBe(false);
  });
});
describe('authoritative output', () => {
  it.each([
    ['0', '0'],
    ['1', '0.000000001'],
    ['689000000', '0.689'],
    ['1000000000', '1'],
    ['9007199254740993123456789', '9007199254740993.123456789'],
  ])('converts %s exactly', (mist, sui) => expect(mistToSui(mist)).toBe(sui));
  it('rejects noninteger balances', () =>
    expect(() => mistToSui('1.2')).toThrow());
  it('cannot have an address replaced or balance invented by model prose', () => {
    const address = '0x' + 'a'.repeat(64);
    const out = renderTurn(
      [
        {
          tool: 'get_balance',
          result: {
            success: true,
            address,
            balanceSui: '0',
            source: 'Sui testnet',
          },
        },
      ],
      'Address: 0xbad. Balance: 999 SUI',
    );
    expect(out).toContain(address);
    expect(out).not.toContain('0xbad');
    expect(out).not.toContain('999');
  });
  it('never displays fabricated success without tool data', () =>
    expect(renderTurn([], 'I remembered that and sent 5 SUI')).not.toContain(
      'I remembered',
    ));
  it('escapes terminal sequences', () => {
    expect(
      renderTurn([
        {
          tool: 'recall',
          result: { success: true, text: '\u001b[2J', source: 'Walrus' },
        },
      ]),
    ).not.toContain('\u001b');
  });
});
describe('SuiNS', () => {
  it('maps NOT_FOUND to null', async () => {
    const sui = createSui(parseEnv({}));
    vi.spyOn(sui, 'defaultNameServiceName').mockRejectedValue({ code: 5 });
    expect(
      await defaultIdentity(sui, '0x2', AbortSignal.timeout(1000)),
    ).toBeNull();
  });
  it('does not confuse an outage with a missing name', async () => {
    const sui = createSui(parseEnv({}));
    vi.spyOn(sui, 'defaultNameServiceName').mockRejectedValue({ code: 14 });
    await expect(
      defaultIdentity(sui, '0x2', AbortSignal.timeout(1000)),
    ).rejects.toEqual({ code: 14 });
  });
});

it('initializes standard headless MemWal with configured delegate credentials', () => {
  const c = parseEnv({
    MEMWAL_ACCOUNT_ID: '0x' + 'a'.repeat(64),
    MEMWAL_PRIVATE_KEY: 'ab'.repeat(32),
  });
  const client = createMemory(c);
  expect(client).toBeDefined();
  expect(typeof client?.remember).toBe('function');
  expect(typeof client?.recall).toBe('function');
});
