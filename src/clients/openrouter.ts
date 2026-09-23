import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import type { Config } from '../config/env.js';
export interface ModelReply {
  content: string | null;
  calls: { id: string; name: string; arguments: string }[];
}
export type ModelClient = (
  messages: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
) => Promise<ModelReply>;
export function createOpenRouter(c: Config): ModelClient {
  if (!c.OPENROUTER_API_KEY)
    throw new Error(
      'Set OPENROUTER_API_KEY in .env to enable AI tool selection. Local slash commands work without it.',
    );
  const client = new OpenAI({
    apiKey: c.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: c.REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });
  return async (messages, tools) => {
    try {
      const response = await client.chat.completions.create({
        model: c.OPENROUTER_MODEL,
        messages,
        tools,
        tool_choice: 'auto',
        ...{ provider: { require_parameters: true } },
      });
      const reply = response.choices[0]?.message;
      if (!reply) throw new Error('Empty response');
      return {
        content: reply.content,
        calls: (reply.tool_calls ?? []).flatMap((call) =>
          call.type === 'function'
            ? [
                {
                  id: call.id,
                  name: call.function.name,
                  arguments: call.function.arguments,
                },
              ]
            : [],
        ),
      };
    } catch (cause) {
      throw new Error(
        'OpenRouter request failed. Check OPENROUTER_API_KEY, connectivity and tool support. Set OPENROUTER_MODEL to an available tool-capable model if openrouter/free is unavailable. Cause: ' +
          (cause instanceof Error ? cause.message : String(cause)),
        { cause },
      );
    }
  };
}
