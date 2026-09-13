import { MemWal } from '@mysten-incubation/memwal';
import type { Config } from '../config/env.js';
export type MemoryClient = Pick<
  MemWal,
  'health' | 'remember' | 'waitForRememberJob' | 'recall'
>;
export function createMemory(c: Config): MemoryClient | undefined {
  if (!c.MEMWAL_ACCOUNT_ID || !c.MEMWAL_PRIVATE_KEY) return undefined;
  return MemWal.create({
    key: c.MEMWAL_PRIVATE_KEY,
    accountId: c.MEMWAL_ACCOUNT_ID,
    serverUrl: c.MEMWAL_RELAYER_URL,
    namespace: c.MEMWAL_NAMESPACE,
  });
}
export async function bounded<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                'Service timed out. Persistence status may be unknown; recall before retrying a write.',
              ),
            ),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
