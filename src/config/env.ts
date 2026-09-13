import { z } from 'zod';
const optional = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(1).optional(),
);
const url = z
  .string()
  .url()
  .refine((v) => {
    try {
      const u = new URL(v);
      return (
        u.protocol === 'https:' &&
        !u.username &&
        !u.password &&
        !/[[\]\s]/.test(v)
      );
    } catch {
      return false;
    }
  }, 'Must be a plain HTTPS URL without credentials or Markdown');
const schema = z
  .object({
    OPENROUTER_API_KEY: optional,
    OPENROUTER_MODEL: z.string().min(1).default('openrouter/free'),
    SUI_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
    SUI_GRPC_URL: url.optional(),
    AGENT_SUINS_NAME: optional,
    WALLET_FILE: z.string().min(1).default('.data/agent-wallet.json'),
    SHOW_PRIVATE_KEY_ON_CREATE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    MEMWAL_ACCOUNT_ID: optional,
    MEMWAL_PRIVATE_KEY: optional,
    MEMWAL_RELAYER_URL: url.default(
      'https://relayer-staging.memory.walrus.xyz',
    ),
    MEMWAL_NAMESPACE: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,80}$/)
      .default('local-sui-agent'),
    LOG_LEVEL: z.enum(['info', 'silent']).default('info'),
    MAX_TOOL_ITERATIONS: z.coerce.number().int().min(1).max(12).default(6),
    REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(120000)
      .default(30000),
  })
  .superRefine((v, ctx) => {
    if (!!v.MEMWAL_ACCOUNT_ID !== !!v.MEMWAL_PRIVATE_KEY)
      ctx.addIssue({
        code: 'custom',
        path: ['MEMWAL_ACCOUNT_ID'],
        message:
          'Set both MEMWAL_ACCOUNT_ID and MEMWAL_PRIVATE_KEY, or neither',
      });
    if (
      v.SUI_GRPC_URL?.includes('fullnode.') &&
      !v.SUI_GRPC_URL.includes(`fullnode.${v.SUI_NETWORK}.sui.io`)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['SUI_GRPC_URL'],
        message: 'Endpoint does not match SUI_NETWORK',
      });
    if (
      v.SUI_NETWORK === 'mainnet' &&
      v.MEMWAL_ACCOUNT_ID &&
      v.MEMWAL_RELAYER_URL.includes('staging')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['MEMWAL_RELAYER_URL'],
        message:
          'Mainnet memory requires an explicitly configured compatible relayer',
      });
  });
export class ConfigurationError extends Error {}
export function parseEnv(input: Record<string, string | undefined>) {
  const r = schema.safeParse(input);
  if (!r.success)
    throw new ConfigurationError(
      'Invalid configuration: ' +
        r.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
    );
  return {
    ...r.data,
    SUI_GRPC_URL:
      r.data.SUI_GRPC_URL ??
      `https://fullnode.${r.data.SUI_NETWORK}.sui.io:443`,
  };
}
export type Config = ReturnType<typeof parseEnv>;
