import type { Context } from '../agent/types.js';
export async function createWallet(c: Context) {
  return {
    success: true,
    ...(await c.wallet.create()),
    source: 'Local Ed25519 key generation',
  };
}
