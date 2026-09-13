import { z } from 'zod';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import type { Context } from './types.js';
import type { ToolResult } from '../output/authoritative-data.js';
import { createWallet } from '../tools/create-wallet.js';
import { getBalance } from '../tools/get-balance.js';
import { resolveSuins } from '../tools/resolve-suins.js';
import { getIdentity } from '../tools/get-agent-suins-identity.js';
import { remember } from '../tools/remember.js';
import { recall } from '../tools/recall.js';
import { doctor } from '../tools/doctor.js';
const empty = z.object({}).strict();
const text = z.string().trim().min(1).max(4000);
const definitions = {
  create_wallet: {
    description:
      'Create a real local Ed25519 wallet only when the user requests creation; reuse existing wallet.',
    schema: empty,
  },
  get_balance: {
    description:
      'Fetch the current agent wallet SUI balance from Sui. Not relevant to remembered preferences.',
    schema: empty,
  },
  resolve_suins: {
    description: 'Resolve a SuiNS name to its current destination address.',
    schema: z
      .object({ name: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,230}\.sui$/) })
      .strict(),
  },
  get_agent_suins_identity: {
    description: 'Read the agent wallet default SuiNS identity on chain.',
    schema: empty,
  },
  remember: {
    description:
      'Persist an explicitly requested durable fact. Local authorization required. Never use for inferred facts or secrets.',
    schema: z.object({ text }).strict(),
  },
  recall: {
    description:
      'Search persistent memory before answering any previously stored preference, fact or rule. Do not query wallet for spending preferences.',
    schema: z.object({ query: text }).strict(),
  },
  doctor: {
    description:
      'Check configuration and service health without revealing credentials.',
    schema: empty,
  },
};
export type ToolName = keyof typeof definitions;
export class ToolRegistry {
  constructor(private c: Context) {}
  available(): ChatCompletionTool[] {
    return Object.entries(definitions)
      .filter(([n]) => this.c.memory || !['remember', 'recall'].includes(n))
      .map(([name, d]) => ({
        type: 'function',
        function: {
          name,
          description: d.description,
          parameters: z.toJSONSchema(d.schema),
        },
      }));
  }
  async execute(
    name: string,
    args: unknown,
    authorization?: { rememberText?: string; createWallet?: boolean },
  ): Promise<ToolResult> {
    try {
      if (!Object.hasOwn(definitions, name))
        return {
          success: false,
          code: 'UNKNOWN_TOOL',
          source: 'Local tool registry',
        };
      const parsed = definitions[name as ToolName].schema.safeParse(args);
      if (!parsed.success)
        return {
          success: false,
          code: 'INVALID_ARGUMENTS',
          source: 'Local tool registry',
          message: 'Arguments do not match the tool schema.',
        };
      const data = parsed.data;
      switch (name as ToolName) {
        case 'create_wallet':
          if (!authorization?.createWallet)
            return {
              success: false,
              code: 'LOCAL_AUTHORIZATION_REQUIRED',
              source: 'Local policy',
              message:
                'Use /wallet create or explicitly ask to create a wallet.',
            };
          return await createWallet(this.c);
        case 'get_balance':
          return await getBalance(this.c);
        case 'resolve_suins':
          return await resolveSuins(this.c, (data as { name: string }).name);
        case 'get_agent_suins_identity':
          return await getIdentity(this.c);
        case 'remember': {
          const value = (data as { text: string }).text;
          if (value !== authorization?.rememberText)
            return {
              success: false,
              code: 'LOCAL_AUTHORIZATION_REQUIRED',
              source: 'Local policy',
              message:
                'Use /remember FACT or begin the request with Remember that ...',
            };
          return await remember(this.c, value);
        }
        case 'recall':
          return await recall(this.c, (data as { query: string }).query);
        case 'doctor':
          return await doctor(this.c);
      }
    } catch {
      return {
        success: false,
        code: 'TOOL_FAILED',
        source: 'Local tool registry',
        message:
          name === 'remember'
            ? 'Persistence was not confirmed. Recall before retrying; a timed-out job may still complete.'
            : 'Operation failed. Check local configuration, wallet permissions and service connectivity with /doctor. No state was inferred.',
      };
    }
  }
}
