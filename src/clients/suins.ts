import type { SuiReader } from './sui.js';
export async function defaultIdentity(
  sui: SuiReader,
  address: string,
  signal: AbortSignal,
) {
  try {
    const { data } = await sui.defaultNameServiceName({ address, signal });
    return data.name ?? null;
  } catch (error) {
    const e = error as { code?: string | number };
    if (e.code === 'NOT_FOUND' || e.code === 5) return null;
    throw error;
  }
}
