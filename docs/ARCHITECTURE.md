# Architecture

`src/cli.ts` composes configuration, clients, wallet storage and the agent. `src/agent/agent.ts` routes explicit common requests locally and delegates other tool selection to OpenRouter. Each turn starts a fresh model context. Durable state comes from MemWal, never a saved transcript.

The registry validates tool parameters using Zod, rejects unknown fields, gates wallet creation and memory writes on local intent, and exposes only configured modules. Tools depend on a typed context. Sui and MemWal use narrow client interfaces, allowing service mocks in unit tests.

WalletStore creates and validates keys locally. Its public operations return only address/network; key export uses a separate terminal callback. Register existing secrets before any model call. Do not broaden the registry with file access, environment inspection, shell execution or arbitrary HTTP calls.

SuiGrpcClient is the blockchain adapter. Name service is already supported by the current Sui client, so a separate `@mysten/suins` dependency would add no functionality for this release's lookups. Core APIs are typed against the locked SDK version.

MemWal's accepted job must reach completion before success is returned. Recall maps `results` into display-safe `memories`, preserving raw semantic distance. Requests have bounded application waits. The SDK does not expose cancellation for these methods: a timed-out write may complete remotely. Do not retry blindly; use recall to investigate.

OpenRouter uses the OpenAI-compatible SDK and `provider.require_parameters` so routing requires tool support. The loop caps rounds, calls per round, and duplicate executions. Only success/error statuses are sent back to the model; authoritative values and recalled content render locally. Generated prose is discarded. This intentionally trades general chat behavior for output integrity. Pattern routing does not parse all English; slash commands provide unambiguous behavior.

No transaction executor exists. Future Nautilus should be a separate computation adapter with explicit attestation and Move verification, not an implicit claim attached to current results.
