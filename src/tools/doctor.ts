import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { Context } from '../agent/types.js';
import { bounded } from '../clients/memwal.js';
import { getIdentity } from './get-agent-suins-identity.js';
export async function doctor(c: Context) {
  const statuses: Record<string, string> = {
    Node: process.versions.node,
    Dependencies: 'OK',
    Network: c.config.SUI_NETWORK,
    OpenRouter: c.config.OPENROUTER_API_KEY
      ? 'configured (authentication not tested)'
      : 'missing (local commands still available)',
    MemWal: c.memory
      ? 'configured'
      : c.config.MEMWAL_ACCOUNT_ID
        ? 'unavailable (initialization failed)'
        : 'disabled (credentials missing)',
  };
  let healthy = true;
  try {
    await c.sui.getChainIdentifier({
      signal: AbortSignal.timeout(c.config.REQUEST_TIMEOUT_MS),
    });
    statuses['Sui RPC'] = 'OK';
  } catch {
    statuses['Sui RPC'] =
      'unavailable (check endpoint, network and connection)';
    healthy = false;
  }
  try {
    const wallet = await c.wallet.publicWallet();
    statuses.Wallet = wallet ? 'found' : 'not created yet';
    if (wallet) {
      const identity = await getIdentity(c);
      statuses.SuiNS =
        identity.success && 'suinsName' in identity
          ? String(identity.suinsName)
          : String(identity.code);
    } else statuses.SuiNS = 'not checked (no wallet)';
  } catch {
    statuses.Wallet = 'unavailable (check file, network and permissions)';
    healthy = false;
  }
  if (c.memory) {
    try {
      await bounded(c.memory.health(), c.config.REQUEST_TIMEOUT_MS);
      statuses['Walrus Memory relayer'] = 'OK';
    } catch {
      statuses['Walrus Memory relayer'] =
        'unavailable (check relayer and credentials)';
      healthy = false;
    }
  } else statuses['Walrus Memory relayer'] = 'not checked (memory disabled)';
  for (const bin of ['sui', 'walrus'])
    statuses[`${bin} CLI`] =
      spawnSync(bin, ['--version'], { stdio: 'ignore', timeout: 5000 })
        .status === 0
        ? 'installed'
        : 'optional missing';
  statuses['Mysten skills'] = existsSync('.agents/skills')
    ? 'installed'
    : existsSync('vendor/mysten-skills')
      ? 'cached'
      : 'optional missing';
  return { success: healthy, statuses, source: 'Local doctor' };
}
