import type { Config } from '../config/env.js';
import type { WalletStore } from '../wallet/wallet-store.js';
import type { SuiReader } from '../clients/sui.js';
import type { MemoryClient } from '../clients/memwal.js';
import type { SecretGuard } from '../security/secret-detection.js';
export interface Context {
  config: Config;
  wallet: WalletStore;
  sui: SuiReader;
  memory?: MemoryClient;
  guard: SecretGuard;
}
