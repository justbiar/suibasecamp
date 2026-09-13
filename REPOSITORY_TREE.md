# Repository tree

Generated files, dependencies, local credentials and private data are omitted.

```text
sui-local-agent/
├── .dockerignore
├── .env.example
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml
│       └── live.yml
├── .gitignore
├── .gitleaks.toml
├── .node-version
├── .npmrc
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── Dockerfile
├── LICENSE
├── README.md
├── REPOSITORY_TREE.md
├── SECURITY.md
├── docs/
│   ├── API_VERIFICATION.md
│   ├── ARCHITECTURE.md
│   ├── NAUTILUS_FUTURE.md
│   ├── SUINS.md
│   ├── TROUBLESHOOTING.md
│   ├── VALIDATION.md
│   └── WALRUS_MEMORY.md
├── eslint.config.js
├── future/
│   └── nautilus/
│       └── README.md
├── package-lock.json
├── package.json
├── scripts/
│   ├── check-node.mjs
│   ├── doctor.sh
│   ├── install-skills.sh
│   ├── install-sui.sh
│   ├── install-tool.sh
│   └── install-walrus.sh
├── setup.sh
├── src/
│   ├── agent/
│   │   ├── agent.ts
│   │   ├── system-prompt.ts
│   │   ├── tool-registry.ts
│   │   └── types.ts
│   ├── cli.ts
│   ├── clients/
│   │   ├── memwal.ts
│   │   ├── openrouter.ts
│   │   ├── sui.ts
│   │   └── suins.ts
│   ├── config/
│   │   └── env.ts
│   ├── index.ts
│   ├── output/
│   │   ├── authoritative-data.ts
│   │   └── formatter.ts
│   ├── security/
│   │   ├── redact.ts
│   │   └── secret-detection.ts
│   ├── tools/
│   │   ├── create-wallet.ts
│   │   ├── doctor.ts
│   │   ├── get-agent-suins-identity.ts
│   │   ├── get-balance.ts
│   │   ├── recall.ts
│   │   ├── remember.ts
│   │   └── resolve-suins.ts
│   └── wallet/
│       └── wallet-store.ts
├── tests/
│   ├── integration/
│   │   └── live.test.ts
│   └── unit/
│       ├── agent.test.ts
│       ├── cli.test.ts
│       ├── core.test.ts
│       └── openrouter.test.ts
├── tsconfig.build.json
└── tsconfig.json
```
