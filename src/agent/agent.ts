import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ModelClient } from '../clients/openrouter.js';
import type { SecretGuard } from '../security/secret-detection.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import { ToolRegistry } from './tool-registry.js';
import type { ToolResult } from '../output/authoritative-data.js';
export function routeLocal(input: string):
  | {
      name: string;
      args: Record<string, string>;
      authorization?: { rememberText?: string; createWallet?: boolean };
    }
  | undefined {
  const value = input.trim();
  const memory = value.match(
    /^(?:\/remember\s+|(?:please\s+)?(?:remember|save|store|keep)\s+(?:that\s+)?)(.+)$/i,
  );
  if (memory?.[1])
    return {
      name: 'remember',
      args: { text: memory[1] },
      authorization: { rememberText: memory[1] },
    };
  if (
    /^\/wallet create$|^(?:please\s+)?create (?:a |my |an? agent )?(?:sui )?wallet[.!]?$/i.test(
      value,
    )
  )
    return {
      name: 'create_wallet',
      args: {},
      authorization: { createWallet: true },
    };
  if (/^\/recall\s+/i.test(value))
    return {
      name: 'recall',
      args: { query: value.replace(/^\/recall\s+/i, '') },
    };
  if (
    /\b(?:my|saved|stored|remembered)\b.*\b(?:preference|rule|limit|maximum|fact)\b|\b(?:preference|rule|limit|maximum)\b.*\b(?:my|saved|stored|remembered)\b/i.test(
      value,
    )
  )
    return { name: 'recall', args: { query: value } };
  if (value === '/balance' || /\b(?:my balance|wallet balance)\b/i.test(value))
    return { name: 'get_balance', args: {} };
  if (value === '/identity' || /who are you on suins/i.test(value))
    return { name: 'get_agent_suins_identity', args: {} };
  const resolve = value.match(/^(?:\/resolve|resolve)\s+([a-z0-9._-]+\.sui)$/i);
  if (resolve?.[1])
    return { name: 'resolve_suins', args: { name: resolve[1] } };
  if (value === '/doctor') return { name: 'doctor', args: {} };
  return undefined;
}
export class Agent {
  constructor(
    private registry: ToolRegistry,
    private guard: SecretGuard,
    private model: ModelClient | undefined,
    private maxIterations = 6,
    private onTool: (name: string) => void = () => {},
  ) {}
  async turn(input: string) {
    if (input.length > 4000) throw new Error('Input exceeds 4000 characters.');
    this.guard.assertSafe(input);
    const results: { tool: string; result: ToolResult }[] = [];
    const local = routeLocal(input);
    if (local) {
      this.onTool(local.name);
      results.push({
        tool: local.name,
        result: await this.registry.execute(
          local.name,
          local.args,
          local.authorization,
        ),
      });
      return results;
    }
    if (!this.model)
      throw new Error(
        'Set OPENROUTER_API_KEY for AI routing, or use /help for local commands.',
      );
    // No conversation transcript: durable facts must come from recall, not prior turns.
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: input },
    ];
    const seen = new Set<string>();
    for (let i = 0; i < this.maxIterations; i++) {
      this.guard.assertSafe(JSON.stringify(messages));
      const reply = await this.model(messages, this.registry.available());
      if (!reply.calls.length) return results;
      if (reply.calls.length > 6)
        throw new Error('Model exceeded the per-round tool limit.');
      // Do not retain model prose or arbitrary echoed secrets in history.
      this.guard.assertSafe(JSON.stringify(reply.calls));
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: reply.calls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: call.arguments },
        })),
      });
      for (const call of reply.calls) {
        let result: ToolResult;
        const signature = call.name + call.arguments;
        if (seen.has(signature))
          result = {
            success: false,
            code: 'REPEATED_TOOL',
            source: 'Local policy',
          };
        else {
          seen.add(signature);
          this.onTool(
            Object.hasOwn(
              Object.fromEntries(
                this.registry
                  .available()
                  .map((t) => [
                    t.type === 'function' ? t.function.name : '',
                    true,
                  ]),
              ),
              call.name,
            )
              ? call.name
              : 'unknown',
          );
          try {
            result = await this.registry.execute(
              call.name,
              JSON.parse(call.arguments),
            );
          } catch {
            result = {
              success: false,
              code: 'INVALID_ARGUMENTS',
              source: 'Local policy',
            };
          }
        }
        results.push({ tool: call.name, result });
        // Give the model only status. Retrieved text never becomes executable prompt context.
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({
            success: result.success,
            code: result.code,
            renderedLocally: true,
          }),
        });
      }
    }
    results.push({
      tool: 'agent',
      result: {
        success: false,
        code: 'ITERATION_LIMIT',
        source: 'Local policy',
        message: 'Stopped after the configured tool-round limit.',
      },
    });
    return results;
  }
}
