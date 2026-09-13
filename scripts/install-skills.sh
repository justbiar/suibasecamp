#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if npx --no-install skills add mystenlabs/skills --all --yes; then
 echo 'Official Mysten skills installed for development. They are not runtime tools.'
else
 echo 'Warning: skills installation unavailable. Trying a source-only cache; runtime is unaffected.'
 mkdir -p vendor
 if [[ ! -d vendor/mysten-skills ]]; then
  git clone --depth 1 https://github.com/MystenLabs/skills.git vendor/mysten-skills || echo 'Warning: cache unavailable. Retry npm run skills:install later.'
 fi
 echo 'Coding agents can read vendor/mysten-skills/*/SKILL.md when cached.'
fi
