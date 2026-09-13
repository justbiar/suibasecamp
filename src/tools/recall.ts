import type { Context } from '../agent/types.js';
import { bounded } from '../clients/memwal.js';
export async function recall(c: Context, query: string) {
  c.guard.assertSafe(query);
  if (!c.memory)
    return { success: false, code: 'MEMORY_DISABLED', source: 'Walrus Memory' };
  const result = await bounded(
    c.memory.recall({ query, limit: 5 }),
    c.config.REQUEST_TIMEOUT_MS,
  );
  return {
    success: true,
    query,
    memories: result.results.map((m) => ({
      text: c.guard.contains(m.text)
        ? '[Blocked: likely secret in stored memory]'
        : m.text,
      distance: m.distance,
    })),
    namespace: c.config.MEMWAL_NAMESPACE,
    source: 'Walrus Memory',
    distanceMeaning:
      'Semantic distance; lower is generally closer. Not a percentage.',
  };
}
