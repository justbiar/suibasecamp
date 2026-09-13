# Walrus Memory

The standard headless `@mysten-incubation/memwal` client accepts `key`, `accountId`, `serverUrl` and `namespace`. Testnet defaults to `https://relayer-staging.memory.walrus.xyz`. Read the [official client guide](https://docs.wal.app/walrus-memory/sdk/usage/memwal) and [delegate management](https://docs.wal.app/walrus-memory/contract/delegate-key-management).

Create a MemWal account and register a delegate public key using the current official dashboard/account flow. Fund or provision the account as instructed there. Store the account object ID in `MEMWAL_ACCOUNT_ID` and the delegate private key in `MEMWAL_PRIVATE_KEY`. Never substitute your account owner's private key. Keep `MEMWAL_NAMESPACE` stable and unique to this agent. Namespace separation is logical scoping within the account, not a replacement for access controls.

The SDK signs requests locally. The relayer receives plaintext, computes embeddings, encrypts through Seal, stores on Walrus and maintains the search index. Recall returns decrypted text. This repository has no custom Seal cryptography. [MemWalManual](https://docs.wal.app/walrus-memory/sdk/usage/memwal-manual) is an advanced option for client-side embedding/encryption workflows; adopting it requires a separately designed data flow and is not this release's default.

## Exact API behavior

`remember(text)` returns `{job_id,status}`. `waitForRememberJob(job_id,{timeoutMs})` resolves only for `done` and throws for failure/not-found/timeout in the locked SDK. We report persistence only after it resolves. A timeout is an unknown outcome, not proof that nothing was stored. The SDK may still finish the request remotely.

`recall({query,limit:5})` returns `{results,total}`; each result includes `text`, `distance` and `blob_id`. This app projects the results into display-safe memories. Distance is semantic/vector distance: lower generally means closer. It is not a percentage or calibrated confidence. Search can return unrelated facts; a returned match is not automatically a correct answer.

Memory lasts for its paid Walrus storage epochs. Plan renewal and inspect current account/relayer limits using the [memory management guide](https://docs.wal.app/walrus-memory/guides/manage-your-memory). The application does not automate renewal, deletion or conflict resolution. Contradictory facts may both be returned.

## Separate-process persistence smoke test

This test performs a real remote write and may consume storage allowance.

1. Configure both credentials and a dedicated namespace. Run `npm run doctor`.
2. Start `npm run agent`.
3. Enter `Remember that my maximum spending per transaction is 5 SUI.`
4. Require `remember` to show `success: true`. If it fails, do not claim the fact was saved.
5. Enter `/exit` and verify the process exits.
6. Start a new `npm run agent` process using the same account and namespace.
7. Enter `What is my maximum spending per transaction?`.
8. Require the `recall` tool to return the stored 5 SUI preference in `memories`. Nothing is loaded from conversation history.

Automated service checks:

```bash
RUN_LIVE_TESTS=true npm run test:integration
# Additional explicit write authorization; uses independently created SDK clients:
RUN_LIVE_TESTS=true RUN_MEMORY_WRITE_TESTS=true npm run test:integration
```

The automated write test is not a substitute for the above full process-restart smoke test. It adds a uniquely marked memory, which remains until its storage expires or you remove it using official account tools. Use a test namespace.

A spending limit stored here is a remembered preference only. It is not a Move-enforced policy.
