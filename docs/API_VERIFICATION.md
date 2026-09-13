# API and dependency verification

Checked 2026-09-13 against official package registry metadata, installed TypeScript declarations/source and these primary sources:

- [Sui querying APIs](https://sdk.mystenlabs.com/sui/clients/querying): SuiGrpcClient getBalance and name-service methods.
- [Sui SDK registry metadata](https://registry.npmjs.org/@mysten%2fsui/latest): installed 2.31.0, Node >=22.
- [SuiNS registry metadata](https://registry.npmjs.org/@mysten%2fsuins/latest): 2.0.6 checked, not added because core lookups already suffice.
- [MemWal client](https://docs.wal.app/walrus-memory/sdk/usage/memwal): standard relayer flow and job waiting; installed 0.1.6 declarations confirm recall's `results` property and `job_id` persistence contract.
- [OpenRouter tool calls](https://openrouter.ai/docs/guides/features/tool-calling): iterative OpenAI-compatible requests with tool-capable providers.
- [Official suiup](https://github.com/MystenLabs/suiup): installer and `suiup install sui@testnet` / `walrus@testnet`.
- [Walrus installation](https://github.com/MystenLabs/Walrus-Onboarding/blob/main/08-Setup-publishers-aggregators/contents/01-setup-installation.md): Testnet tooling alternatives.
- [Official Mysten skills](https://github.com/MystenLabs/skills): source repository, checked with the locked skills CLI list command.

Runtime direct dependencies: @mysten/sui 2.31.0, @mysten-incubation/memwal 0.1.6, openai 7.15.0, zod 4.6.4, dotenv 17.4.2, @scure/bip39 2.4.0. See package.json and package-lock.json for full development and transitive versions.

The npm latest TypeScript release was 7.0.2, but typescript-eslint 8.70.0 requires TypeScript <6.1.0, so 6.0.3 is the latest compatible stable selection. npm-check-updates raises the complete toolchain's minimum Node version to 22.22.2. No force/legacy-peer-deps workaround was used.

Live credential-dependent validation must not be inferred from unit mocks or public health checks. See VALIDATION.md for results from this checkout.
