# SuiNS identity

1. Create your agent wallet using `/wallet create`; copy the full address from verified tool data.
2. Open the [official SuiNS application](https://suins.io/) and use its Testnet environment. Follow the current [SuiNS documentation](https://docs.suins.io/) if the UI's environment selector changes.
3. With a Testnet-capable wallet and test funds, register a name you control, set its target to the agent's address, and set the agent address's default name. Default-name updates require the appropriate wallet authorization; merely setting a forward target may not establish reverse identity.
4. Optionally set `AGENT_SUINS_NAME=your-name.sui` in `.env`.
5. Run `/resolve your-name.sui` and `/identity`. They read live chain data. The configured name is only an expectation; mismatches remain visible.

The current [Sui querying APIs](https://sdk.mystenlabs.com/sui/clients/querying) provide `resolveNameServiceAddress({name})` and `defaultNameServiceName({address})`. The former returns `{address}`, the latter `{data:{name}}`. Null names or recognized NOT_FOUND errors are handled cleanly. Transport failures are not interpreted as missing identities.

No registration transaction is implemented here. Users are responsible for registering and setting defaults manually, without posting their key into the AI chat. Names can expire or change targets; resolve again when implementing any future transaction destination flow.

`biaragent.sui` is a historical prototype example. Neither it nor the prototype address is a default for repository users.
