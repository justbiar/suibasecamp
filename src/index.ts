import { main } from './cli.js';
import { ConfigurationError } from './config/env.js';
main().catch((e: unknown) => {
  console.error(
    e instanceof ConfigurationError
      ? e.message
      : 'Startup failed. Check wallet format/permissions and MemWal credential format. No credentials were logged.',
  );
  process.exitCode = 1;
});
