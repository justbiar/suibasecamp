# Validation report

Validated locally on 2026-09-13 with Node 22.23.2 on macOS.

| Check                                                        | Result                                                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Clean install via setup.sh / npm ci                          | PASS; 171 installed packages                                                                   |
| TypeScript typecheck                                         | PASS                                                                                           |
| ESLint                                                       | PASS                                                                                           |
| Prettier check                                               | PASS                                                                                           |
| Unit and local process tests                                 | PASS; 48 tests across 4 files                                                                  |
| Production TypeScript build                                  | PASS                                                                                           |
| Built CLI starts without OpenRouter/MemWal credentials       | PASS                                                                                           |
| Wallet creation, restart reuse, permission checks            | PASS                                                                                           |
| Redirected CLI output and export cannot expose wallet secret | PASS                                                                                           |
| Headless MemWal construction with synthetic delegate         | PASS; no live authorization implied                                                            |
| OpenRouter HTTP request contract and error handling          | PASS with mocked transport                                                                     |
| Live Testnet balance read                                    | PASS in initial live run                                                                       |
| Live Testnet SuiNS missing-name resolution                   | PASS in initial live run                                                                       |
| Integration tests without opt-in                             | All 4 skipped as designed                                                                      |
| Doctor                                                       | Initial run PASS; final bootstrap run reported Sui RPC unavailable during network/DNS failures |
| Public staging relayer health probe                          | Inconclusive: DNS resolution timed out                                                         |
| Gitleaks repository scan                                     | PASS; no leaks found                                                                           |
| Git exclusions for .env and wallet data                      | PASS                                                                                           |
| English-only source/docs review and special-character scan   | PASS                                                                                           |
| Node 20 rejection                                            | PASS; actionable upgrade instruction                                                           |
| Optional Sui helper                                          | PASS using existing Sui 1.79.0; dedicated configuration reports testnet                        |
| Official Mysten skills listing                               | PASS; 32 skills discovered                                                                     |

The final doctor failure is retained here rather than represented as success. Initial live Testnet checks returned actual data; later shell network calls encountered DNS/connectivity failures. Retry `npm run doctor` on a working network.

## Still requires user credentials or hosting setup

- Live OpenRouter authentication/model availability: not tested; no key provided.
- Live MemWal authenticated remember/recall and full cross-process persistence: not tested; no account/delegate provided. Follow WALRUS_MEMORY.md after configuring credentials. Mocked completion/failure behavior is covered.
- A registered wallet SuiNS default name: not tested for a user wallet; no registration performed.
- Missing-binary downloads for Sui/Walrus: scripts are based on verified official install commands; no forced system upgrade or Walrus install was performed.
- GitHub-hosted CI execution and repository branch protection: workflow files are supplied; this repository has not been published to a remote.
- Optional Docker scanner image execution: local Gitleaks passed; hosted workflow has not run here.

No transfers, swaps, on-chain spending enforcement, Nautilus, AWS resources or custom Seal encryption were implemented. A production deployment still needs its own operational review and live credential-dependent smoke tests.
