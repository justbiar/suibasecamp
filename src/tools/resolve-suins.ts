import type { Context } from '../agent/types.js';
export async function resolveSuins(c: Context, name: string) {
  const { address } = await c.sui.resolveNameServiceAddress({
    name,
    signal: AbortSignal.timeout(c.config.REQUEST_TIMEOUT_MS),
  });
  return {
    success: !!address,
    ...(!address
      ? {
          code: 'NOT_FOUND',
          message: 'No active destination address for this name.',
        }
      : {}),
    name,
    address,
    network: c.config.SUI_NETWORK,
    source: 'SuiNS',
  };
}
