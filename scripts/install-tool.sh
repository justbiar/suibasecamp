#!/usr/bin/env bash
set -euo pipefail
binary="${1:?Expected sui or walrus}"
case "$binary" in sui|walrus) ;; *) echo 'Unsupported tool.'; exit 1;; esac
shift
force=false
if [[ "${1:-}" == '--force-update' ]]; then force=true; shift; fi
[[ $# -eq 0 ]] || { echo 'Only --force-update is supported.'; exit 1; }
export PATH="$HOME/.local/bin:$PATH"
if command -v "$binary" >/dev/null && [[ "$force" == false ]]; then
 "$binary" --version
else
 if ! command -v suiup >/dev/null; then
  command -v curl >/dev/null || { echo 'curl is required to download official suiup.'; exit 1; }
  installer=$(mktemp)
  trap 'rm -f "$installer"' EXIT
  curl --fail --silent --show-error --location https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh -o "$installer"
  sh "$installer"
 fi
 suiup install "$binary@testnet" --yes
 "$binary" --version
fi
if [[ "$binary" == sui ]]; then
 echo 'Verifying a dedicated Testnet CLI configuration; existing Sui wallets are untouched.'
 mkdir -p .data/sui-cli
 chmod 700 .data .data/sui-cli
 # A config without an active address supports read/development commands.
 if [[ ! -e .data/sui-cli/client.yaml ]]; then
  (umask 077; cat > .data/sui-cli/client.yaml <<'CONFIG'
keystore:
  File: .data/sui-cli/sui.keystore
envs:
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io:443"
    ws: null
    basic_auth: null
active_env: testnet
active_address: null
CONFIG
  )
  (umask 077; printf '[]\n' > .data/sui-cli/sui.keystore)
 fi
 sui client --client.config .data/sui-cli/client.yaml active-env
 echo 'Use: sui client --client.config .data/sui-cli/client.yaml <command>'
fi
echo 'Tool installation complete. Ensure $HOME/.local/bin is on PATH. Existing wallets were not imported or replaced.'
