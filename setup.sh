#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v git >/dev/null || { echo 'Git is required. Install Git and retry.'; exit 1; }
command -v node >/dev/null || { echo 'Install Node.js >=22.22.2, then retry.'; exit 1; }
node scripts/check-node.mjs
command -v npm >/dev/null || { echo 'npm is required; install a standard Node.js distribution.'; exit 1; }
for arg in "$@"; do
 case "$arg" in --with-sui|--with-skills|--with-walrus) ;; *) echo "Unknown option: $arg"; exit 1;; esac
done
umask 077
npm ci
if [[ ! -f .env ]]; then cp .env.example .env; fi
chmod 600 .env
mkdir -p .data
chmod 700 .data
for arg in "$@"; do
 case "$arg" in
 --with-sui) bash scripts/install-sui.sh ;;
 --with-skills) bash scripts/install-skills.sh ;;
 --with-walrus) bash scripts/install-walrus.sh ;;
 esac
done
npm run typecheck
npm run lint
npm test
npm run build
if ! npm run doctor; then echo 'Doctor found a service/configuration issue. Setup is installed; review the statuses above.'; fi
cat <<'END'
Setup complete.

For AI tool selection:
- Add OPENROUTER_API_KEY to .env locally.
For persistent memory:
- Add MEMWAL_ACCOUNT_ID and MEMWAL_PRIVATE_KEY to .env locally.
Optional:
- Register a Testnet SuiNS name and set your wallet default identity.
- Run npm run sui:install, npm run skills:install, or npm run walrus:install.

Run: npm run agent
Local slash commands work without an OpenRouter key. Type /help.
END
