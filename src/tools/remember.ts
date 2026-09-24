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
  // Persisting to Walrus embeds the text, Seal-encrypts it and writes a blob.
  // That measured about 32s against the staging relayer, past the 30s default,
  // so writes that had actually landed were reported as failures. The job gets
  // a budget of its own rather than the timeout used for ordinary reads.
  const jobTimeoutMs = Math.max(c.config.REQUEST_TIMEOUT_MS * 4, 120_000);
  await bounded(
    c.memory.waitForRememberJob(job.job_id, { timeoutMs: jobTimeoutMs }),
    jobTimeoutMs + 1000,
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
