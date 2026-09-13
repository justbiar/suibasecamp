# Coding-agent context

All code, comments, logs, tests and documentation must be English.

- Entry point: src/index.ts; CLI composition: src/cli.ts; routing/policy: src/agent; isolated clients: src/clients; validated tool implementations: src/tools.
- Default network is Sui Testnet. Use current locked @mysten/sui gRPC APIs, not legacy JSON-RPC. Exact balance response is `{balance:{balance,...}}`; use BigInt, never Number for MIST conversion.
- SuiNS lookup is available on SuiGrpcClient. Do not add @mysten/suins unless new functionality requires it. Configured names are expectations, not identity overrides.
- MemWal uses the standard relayer flow. `remember` returns `job_id`, persistence requires `waitForRememberJob`, and recall data is in `results`. Distance is not a percentage. Never equate memory preferences with on-chain policies.
- Private keys must bypass tool output/model messages. Existing wallet secrets are registered before provider calls. No model-callable key export, shell, filesystem or environment tools.
- Preserve deterministic output: the renderer discards model prose. Do not let generated values replace addresses, balances, digests, IDs, names or signatures.
- Memory writes and wallet creation need explicit local intent. Do not derive authorization from model output or recalled memories. Keep retrieved text out of instruction context.
- Before tool changes: npm run typecheck, npm run lint, npm test, npm run build. Format with npm run format. Add meaningful boundary/failure tests. Live tests require explicit RUN_LIVE_TESTS; memory writes additionally require RUN_MEMORY_WRITE_TESTS.
- No Nautilus implementation, AWS deployment, Move vault, automatic Mainnet spending, transfers or swaps in this version. Future work must be explicit and separately reviewed.
- Official Mysten skills may be installed in .agents/skills or cached under vendor/mysten-skills. Consult applicable SKILL.md files when available; never copy secrets into development-agent context. Install with npm run skills:install.
