import { it, expect, vi, afterEach } from 'vitest';
import { createOpenRouter } from '../../src/clients/openrouter.js';
import { parseEnv } from '../../src/config/env.js';
afterEach(() => vi.unstubAllGlobals());
it('sends OpenAI-compatible tool requests to OpenRouter', async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: 'test',
        object: 'chat.completion',
        created: 1,
        model: 'test',
        choices: [
          {
            index: 0,
            finish_reason: 'tool_calls',
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call',
                  type: 'function',
                  function: { name: 'get_balance', arguments: '{}' },
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  );
  vi.stubGlobal('fetch', fetch);
  const client = createOpenRouter(
    parseEnv({ OPENROUTER_API_KEY: 'test-only-placeholder' }),
  );
  const r = await client(
    [{ role: 'user', content: 'balance' }],
    [
      {
        type: 'function',
        function: {
          name: 'get_balance',
          parameters: { type: 'object', properties: {} },
        },
      },
    ],
  );
  expect(r.calls[0]?.name).toBe('get_balance');
  expect(String(fetch.mock.calls[0]?.[0])).toContain(
    'https://openrouter.ai/api/v1/chat/completions',
  );
  const body = JSON.parse(fetch.mock.calls[0]?.[1]?.body as string);
  expect(body.model).toBe('openrouter/free');
  expect(body.provider.require_parameters).toBe(true);
});
it('gives a safe actionable error for unavailable models', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response('remote-sensitive-error', { status: 404 }),
      ),
  );
  await expect(
    createOpenRouter(parseEnv({ OPENROUTER_API_KEY: 'test-only-placeholder' }))(
      [],
      [],
    ),
  ).rejects.toThrow('OPENROUTER_MODEL');
});
