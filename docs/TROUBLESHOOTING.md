# Troubleshooting

| Symptom                             | Action                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node version error                  | Run `nvm install && nvm use`; require at least 22.22.2 for the complete toolchain.                                                                    |
| Missing configuration               | Read field names in the error; edit `.env` locally. Never paste credential values into chat.                                                          |
| MemWal disabled                     | Set both account ID and delegate key; keep namespace unchanged across restarts.                                                                       |
| MemWal unavailable                  | Verify staging URL, account/delegate authorization, provisioning and relayer health. A health response alone does not prove credential authorization. |
| Persistence not confirmed           | Recall before retrying; the remote job may complete after timeout.                                                                                    |
| No recalled result                  | Verify account, namespace, storage lifetime and the earlier successful persistence response.                                                          |
| Sui RPC unavailable                 | Check HTTPS URL, configured network, firewall, provider status and public endpoint rate limits.                                                       |
| Malformed URL                       | Use a raw URL, never `[URL](URL)` Markdown.                                                                                                           |
| Wallet permission error             | Set directory permissions to 700 and wallet file permissions to 600; do not use shared/symlink paths.                                                 |
| Wallet/key mismatch or corrupt file | Restore a trusted backup; the agent never replaces an existing file.                                                                                  |
| Network mismatch                    | Choose a separate wallet file and matching endpoint for each network.                                                                                 |
| SuiNS NOT_FOUND                     | Register an active name and set the generated wallet's default identity; an env var cannot do this.                                                   |
| OpenRouter error                    | Check key, quota, connectivity and tool support. Set `OPENROUTER_MODEL` if the free router has no suitable provider.                                  |
| No verified result                  | Use `/help` and explicit slash commands. General model prose is intentionally not shown.                                                              |
| Tool limit reached                  | Narrow the request or use a direct command; do not remove loop limits.                                                                                |
| Optional skills install fails       | Runtime still works. Retry later or inspect the official source cache under `vendor/mysten-skills`.                                                   |

`npm run doctor` never prints credentials and does not create a wallet, authenticate with OpenRouter, register SuiNS, or persist test memory. Its nonzero status means a checked service failed, not that setup was rolled back. Optional missing services are labeled accordingly.

For SDK upgrades, consult exact installed declarations and official sources before changing APIs. Keep the lockfile and run all required checks; do not combine old JSON-RPC examples with current gRPC code.
