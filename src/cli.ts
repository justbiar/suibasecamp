import { createInterface } from 'node:readline';
import { config as dotenv } from 'dotenv';
import { parseEnv } from './config/env.js';
import { SecretGuard } from './security/secret-detection.js';
import { WalletStore } from './wallet/wallet-store.js';
import { createSui } from './clients/sui.js';
import { createMemory, bounded } from './clients/memwal.js';
import { createOpenRouter } from './clients/openrouter.js';
import { ToolRegistry } from './agent/tool-registry.js';
import { Agent } from './agent/agent.js';
import { renderTurn } from './output/formatter.js';
import { doctor } from './tools/doctor.js';
import type { MemoryClient } from './clients/memwal.js';
export async function main() {
  dotenv({ quiet: true });
  const config = parseEnv(process.env);
  const guard = new SecretGuard();
  guard.register(config.OPENROUTER_API_KEY);
  guard.register(config.MEMWAL_PRIVATE_KEY);
  const reveal = (key: string) => {
    if (!process.stdout.isTTY || !process.stdin.isTTY)
      throw new Error(
        'Private key display requires an interactive local terminal.',
      );
    process.stdout.write(
      'LOCAL SECRET WARNING: Anyone with this key controls this wallet. Store offline; never paste into chat or memory.\n' +
        key +
        '\n',
    );
  };
  const wallet = new WalletStore(
    config.WALLET_FILE,
    config.SUI_NETWORK,
    guard,
    config.SHOW_PRIVATE_KEY_ON_CREATE &&
      process.stdout.isTTY &&
      process.stdin.isTTY
      ? reveal
      : undefined,
  );
  await wallet.publicWallet(); // Register an existing key before any provider call.
  let memory: MemoryClient | undefined;
  let memoryInitializationFailed = false;
  try {
    memory = createMemory(config);
  } catch {
    memoryInitializationFailed = true;
    console.error(
      'Walrus Memory could not initialize. Check MEMWAL_PRIVATE_KEY format and account settings locally. Memory tools disabled.',
    );
  }
  const context = {
    config,
    guard,
    wallet,
    sui: createSui(config),
    memory,
  };
  const command = process.argv[2];
  if (command === 'wallet:export') {
    await wallet.exportLocal(reveal);
    return;
  }
  if (command === 'doctor') {
    const result = await doctor(context);
    console.log(renderTurn([{ tool: 'doctor', result }]));
    if (!result.success || memoryInitializationFailed) process.exitCode = 1;
    return;
  }
  const registry = new ToolRegistry(context);
  const agent = new Agent(
    registry,
    guard,
    config.OPENROUTER_API_KEY ? createOpenRouter(config) : undefined,
    config.MAX_TOOL_ITERATIONS,
    (name) => {
      if (config.LOG_LEVEL === 'info') console.log('Tool > ' + name);
    },
  );
  let memoryStatus = memoryInitializationFailed
    ? 'unavailable (configuration error)'
    : context.memory
      ? 'configured'
      : 'disabled';
  if (context.memory) {
    try {
      await bounded(context.memory.health(), config.REQUEST_TIMEOUT_MS);
      memoryStatus = 'Walrus connected';
    } catch {
      memoryStatus = 'unavailable; run /doctor';
    }
  }
  console.log(
    `================================================\n  Sui Local Agent\n================================================\nNetwork: ${config.SUI_NETWORK}\nModel: ${config.OPENROUTER_MODEL}\nMemory: ${memoryStatus}\nIdentity: use /identity for the on-chain default\nType /help for commands; /exit to quit.\n================================================`,
  );
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: !!process.stdin.isTTY,
  });
  const help =
    '/wallet create | /balance | /identity | /resolve example.sui | /remember FACT | /recall QUESTION | /doctor | /exit';
  rl.setPrompt('You > ');
  rl.prompt();
  try {
    for await (const input of rl) {
      if (['/exit', 'exit', 'quit'].includes(input.trim())) break;
      if (input.trim() === '/help') console.log(help);
      else if (input.trim()) {
        try {
          console.log(renderTurn(await agent.turn(input)));
        } catch (e) {
          console.error(
            guard.redact(e instanceof Error ? e.message : 'Operation failed.'),
          );
        }
      }
      rl.prompt();
    }
  } finally {
    rl.close();
  }
}
