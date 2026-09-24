/* Register this agent in the shared workshop directory.
 *
 *   npm run register            # simulate, show what would be registered
 *   npm run register -- --yes   # sign and send
 *
 * Everything is read from the agent's own configuration: the wallet signs the
 * transaction itself, so the Sui CLI is not involved and no key is imported.
 */

import { readFileSync } from 'node:fs';
import { config as dotenv } from 'dotenv';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { TOOL_NAMES } from '../src/agent/tool-registry.js';

// doctor inspects the local install; it is not a capability another party
// could call, so the directory entry leaves it out.
const SKILLS = TOOL_NAMES.filter((n) => n !== 'doctor');

const PACKAGE =
  '0x73795ef21ec3554a141ddcf8d8b6696245762c8a071eeec4bbda2b0818f694c7';
const TYPE = `${PACKAGE}::agent_profile::AgentProfileV2`;
const GAS_BUDGET = 10_000_000n;

dotenv({ quiet: true });
const execute = process.argv.includes('--yes');
const network = process.env.SUI_NETWORK || 'testnet';

const walletFile = process.env.WALLET_FILE || '.data/agent-wallet.json';
let wallet;
try {
  wallet = JSON.parse(readFileSync(walletFile, 'utf8'));
} catch {
  console.error(`No wallet at ${walletFile}. Run npm run agent and create one first.`);
  process.exit(1);
}
const keypair = Ed25519Keypair.fromSecretKey(wallet.secretKey);
const sender = keypair.toSuiAddress();
if (sender !== wallet.address) {
  console.error('The wallet file address does not match its secret key.');
  process.exit(1);
}

const client = new SuiGrpcClient({
  network,
  baseUrl: process.env.SUI_GRPC_URL || `https://fullnode.${network}.sui.io:443`,
});

// The module proves the wallet by signature; every other field is a claim, so
// take them from what this agent is actually configured with.
const suinsName =
  (await client
    .defaultNameServiceName({ address: sender })
    .then((r) => r?.data?.name ?? null)
    .catch(() => null)) ||
  process.env.AGENT_SUINS_NAME ||
  '';
const namespace = process.env.MEMWAL_NAMESPACE || 'local-sui-agent';
const endpoint = 'local://sui-local-agent';
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;

const { balance } = await client.getBalance({
  owner: sender,
  coinType: '0x2::sui::SUI',
});
const have = BigInt(balance?.balance ?? balance ?? 0);

// The directory itself reads profiles over GraphQL, and listOwnedObjects
// returned the type inconsistently here, so ask the same way the directory does.
const GRAPHQL = process.env.SUI_GRAPHQL_URL || `https://graphql.${network}.sui.io/graphql`;
const existing = await fetch(GRAPHQL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `query($owner: SuiAddress!, $type: String!) {
      address(address: $owner) { objects(filter: {type: $type}) { nodes { address } } }
    }`,
    variables: { owner: sender, type: TYPE },
  }),
  signal: AbortSignal.timeout(15000),
})
  .then((r) => r.json())
  .then((r) => r?.data?.address?.objects?.nodes ?? [])
  .catch(() => []);

console.log(`network     ${network}`);
console.log(`wallet      ${sender}`);
console.log(`balance     ${(Number(have) / 1e9).toFixed(4)} SUI`);
console.log(`suins       ${suinsName || '(none set on chain)'}`);
console.log(`namespace   ${namespace}`);
console.log(`endpoint    ${endpoint}`);
console.log(`version     ${version}`);
console.log(`skills      ${SKILLS.join(', ')}`);

if (!suinsName) {
  console.error(
    '\nNo SuiNS name resolves to this wallet. Register one and set it as the\n' +
      'wallet default, or set AGENT_SUINS_NAME in .env, then run this again.',
  );
  process.exit(1);
}
if (have < GAS_BUDGET) {
  console.error(`\nNot enough SUI for gas. Fund ${sender} from the testnet faucet.`);
  process.exit(1);
}
if (existing.length) {
  console.error(
    `\nThis wallet already owns ${existing.length} profile(s) in the shared package.\n` +
      'Registering again would add a duplicate to the directory.',
  );
  process.exit(1);
}

const tx = new Transaction();
tx.setSender(sender);
tx.setGasBudget(GAS_BUDGET);
tx.moveCall({
  target: `${PACKAGE}::agent_profile::create_v2`,
  arguments: [
    tx.pure.address(sender),
    tx.pure.string(suinsName),
    tx.pure.string(namespace),
    tx.pure.string(endpoint),
    tx.pure.string(version),
    tx.pure.vector('string', SKILLS),
  ],
});

if (!execute) {
  const sim = await client.simulateTransaction({ transaction: tx });
  const status = sim?.transaction?.effects?.status;
  if (status?.success === false) {
    console.error(`\nThe call would fail: ${status.error ?? 'unknown reason'}`);
    process.exit(1);
  }
  console.log('\nSimulated successfully. Nothing was sent.');
  console.log('To register for real:  npm run register -- --yes');
  process.exit(0);
}

const res = await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
const digest = res?.transaction?.digest ?? res?.digest;
await client.waitForTransaction({ digest });
console.log(`\nRegistered. Transaction ${digest}`);
console.log('It appears in the directory once indexed, usually within a minute:');
console.log('  https://suibasecampworkshop.pages.dev/agents');
