import { constants } from 'node:fs';
import { open, mkdir, lstat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { z } from 'zod';
import type { SecretGuard } from '../security/secret-detection.js';
const walletSchema = z.object({
  address: z.string().regex(/^0x[0-9a-f]{64}$/),
  secretKey: z.string(),
  network: z.enum(['testnet', 'mainnet']),
});
export class WalletStore {
  constructor(
    private file: string,
    private network: 'testnet' | 'mainnet',
    private guard: SecretGuard,
    private reveal?: (key: string) => void,
  ) {}
  async load() {
    try {
      const handle = await open(
        resolve(this.file),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const stat = await handle.stat();
        if (
          !stat.isFile() ||
          (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)
        )
          throw new Error(
            'Wallet permissions are unsafe. Set wallet file permissions to 600.',
          );
        const parsed = walletSchema.safeParse(
          JSON.parse(await handle.readFile('utf8')),
        );
        if (!parsed.success)
          throw new Error(
            'Invalid wallet file. Restore a valid backup; the file will not be replaced.',
          );
        const wallet = parsed.data;
        this.guard.register(wallet.secretKey);
        if (wallet.network !== this.network)
          throw new Error(
            'Wallet network differs from SUI_NETWORK. Use a separate wallet file per network.',
          );
        if (
          Ed25519Keypair.fromSecretKey(wallet.secretKey).toSuiAddress() !==
          wallet.address
        )
          throw new Error(
            'Wallet address/key mismatch. Restore a valid backup.',
          );
        return wallet;
      } finally {
        await handle.close();
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  async publicWallet() {
    const w = await this.load();
    return w ? { address: w.address, network: w.network } : null;
  }
  async create() {
    const existing = await this.publicWallet();
    if (existing) return { ...existing, created: false };
    const parent = dirname(resolve(this.file));
    await mkdir(parent, { recursive: true, mode: 0o700 });
    const stat = await lstat(parent);
    if (
      stat.isSymbolicLink() ||
      (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)
    )
      throw new Error(
        'Wallet directory must be private (permissions 700) and not a symlink.',
      );
    const keypair = new Ed25519Keypair();
    const secretKey = keypair.getSecretKey();
    this.guard.register(secretKey);
    const wallet = {
      address: keypair.toSuiAddress(),
      secretKey,
      network: this.network,
    };
    let handle;
    try {
      handle = await open(
        resolve(this.file),
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST')
        throw new Error(
          'Another process created the wallet. Retry to load it safely.',
          { cause: e },
        );
      throw e;
    }
    try {
      await handle.writeFile(JSON.stringify(wallet, null, 2) + '\n');
      await handle.sync();
    } finally {
      await handle.close();
    }
    this.reveal?.(secretKey);
    return { address: wallet.address, network: this.network, created: true };
  }
  async exportLocal(reveal: (key: string) => void) {
    const w = await this.load();
    if (!w) throw new Error('No wallet exists. Create one first.');
    reveal(w.secretKey);
  }
}
