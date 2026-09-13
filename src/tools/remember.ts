import type { Context } from '../agent/types.js';
import { bounded } from '../clients/memwal.js';
export async function remember(c: Context, text: string) {
  c.guard.assertSafe(text);
  if (!c.memory)
    return { success: false, code: 'MEMORY_DISABLED', source: 'Walrus Memory' };
  const job = await bounded(
    c.memory.remember(text),
    c.config.REQUEST_TIMEOUT_MS,
  );
  await bounded(
    c.memory.waitForRememberJob(job.job_id, {
      timeoutMs: c.config.REQUEST_TIMEOUT_MS,
    }),
    c.config.REQUEST_TIMEOUT_MS + 1000,
  );
  return {
    success: true,
    text,
    jobId: job.job_id,
    namespace: c.config.MEMWAL_NAMESPACE,
    source: 'Walrus Memory',
    message:
      'Memory persisted successfully. This is a preference, not an on-chain spending policy.',
  };
}
