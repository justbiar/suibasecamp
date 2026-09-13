import type { Context } from '../agent/types.js';
import { mistToSui } from '../output/authoritative-data.js';
export async function getBalance(c: Context) {
  const wallet = await c.wallet.publicWallet();
  if (!wallet)
    return {
      success: false,
      code: 'NO_WALLET',
      source: 'Local wallet',
      message: 'Create a wallet first.',
    };
  const { balance } = await c.sui.getBalance({
    owner: wallet.address,
    coinType: '0x2::sui::SUI',
    signal: AbortSignal.timeout(c.config.REQUEST_TIMEOUT_MS),
  });
  return {
    success: true,
    ...wallet,
    balanceMist: balance.balance,
    balanceSui: mistToSui(balance.balance),
    coinType: balance.coinType,
    source: `Sui ${wallet.network}`,
    checkedAt: new Date().toISOString(),
  };
}
