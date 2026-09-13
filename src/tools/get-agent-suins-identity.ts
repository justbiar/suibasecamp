import type { Context } from '../agent/types.js';
import { defaultIdentity } from '../clients/suins.js';
export async function getIdentity(c: Context) {
  const wallet = await c.wallet.publicWallet();
  if (!wallet)
    return { success: false, code: 'NO_WALLET', source: 'Local wallet' };
  const name = await defaultIdentity(
    c.sui,
    wallet.address,
    AbortSignal.timeout(c.config.REQUEST_TIMEOUT_MS),
  );
  return {
    success: !!name,
    ...wallet,
    suinsName: name,
    configuredName: c.config.AGENT_SUINS_NAME ?? null,
    configuredNameMatchesDefault: c.config.AGENT_SUINS_NAME
      ? name === c.config.AGENT_SUINS_NAME
      : null,
    ...(!name
      ? {
          code: 'NOT_FOUND',
          message:
            'The wallet has no default SuiNS identity. Register and set one manually.',
        }
      : {}),
    source: 'SuiNS',
  };
}
