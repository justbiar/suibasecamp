/* Write credentials into .env without opening an editor.
 *
 *   npm run set-key
 *
 * Asks for each credential in turn. Press Enter to skip one and leave whatever
 * .env already holds. Secrets are read with the terminal echo off and are never
 * printed back.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';

const FILE = '.env';
const EXAMPLE = '.env.example';

const FIELDS = [
  {
    name: 'OPENROUTER_API_KEY',
    label: 'OpenRouter key',
    hidden: true,
    help: 'Create one at https://openrouter.ai/keys',
    valid: (v) => /^sk-or-[A-Za-z0-9._~-]+$/.test(v),
    hint: 'OpenRouter keys start with "sk-or-".',
  },
  {
    name: 'MEMWAL_ACCOUNT_ID',
    label: 'Walrus Memory account id',
    hidden: false,
    help: 'Optional. Needed only for memory that survives a restart.',
    valid: (v) => /^0x[0-9a-fA-F]{64}$/.test(v),
    hint: 'An account id is 0x followed by 64 hex characters.',
  },
  {
    name: 'MEMWAL_PRIVATE_KEY',
    label: 'Walrus Memory delegate key',
    hidden: true,
    help: 'The authorized delegate key, not your account owner wallet key.',
    valid: (v) => /^[0-9a-fA-F]{64}$/.test(v),
    hint: 'A delegate key is 64 hex characters, with no 0x prefix.',
  },
];

if (!existsSync(FILE)) {
  if (!existsSync(EXAMPLE)) {
    console.error(`No ${FILE} and no ${EXAMPLE}. Run ./setup.sh first.`);
    process.exit(1);
  }
  copyFileSync(EXAMPLE, FILE);
  console.log(`Created ${FILE} from ${EXAMPLE}.`);
}
if (!process.stdin.isTTY) {
  console.error('Run this in an interactive terminal so secrets are not echoed.');
  process.exit(1);
}

/* Raw mode rather than readline: readline echoes each keystroke before anything
   here could erase it, which would defeat hiding a secret. */
function ask(label, hidden) {
  return new Promise((resolve, reject) => {
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let buf = '';
    const finish = (fn, value) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
      fn(value);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish(resolve, buf.trim());
        if (ch === '\u0003') return finish(reject, new Error('cancelled'));
        if (ch === '\u007f' || ch === '\b') {
          if (buf.length) {
            buf = buf.slice(0, -1);
            if (!hidden) process.stdout.write('\b \b');
          }
        } else if (ch >= ' ') {
          buf += ch;
          if (!hidden) process.stdout.write(ch);
        }
      }
    };
    process.stdin.on('data', onData);
  });
}

let text = readFileSync(FILE, 'utf8');
const current = (name) =>
  (text.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1] ?? '').trim();

console.log('Press Enter to skip a field and keep what .env already has.\n');

const updates = new Map();
for (const f of FIELDS) {
  const has = current(f.name) ? ' [already set]' : '';
  console.log(`${f.label}${has}\n  ${f.help}`);
  let value;
  try {
    value = await ask('  > ', f.hidden);
  } catch {
    console.error('\nCancelled; .env left unchanged.');
    process.exit(1);
  }
  if (!value) {
    console.log('  skipped\n');
    continue;
  }
  if (!f.valid(value)) {
    console.error(`  ${f.hint}\n  .env left unchanged.`);
    process.exit(1);
  }
  updates.set(f.name, value);
  console.log('  saved\n');
}

if (!updates.size) {
  console.log('Nothing changed.');
  process.exit(0);
}

// The configuration rejects one half of the Walrus pair on its own, so catch it
// here rather than letting the agent fail to start.
const willHave = (name) => updates.get(name) ?? current(name);
if (!!willHave('MEMWAL_ACCOUNT_ID') !== !!willHave('MEMWAL_PRIVATE_KEY')) {
  console.error(
    'Walrus Memory needs both the account id and the delegate key, or neither.\n' +
      'Set the missing one and run this again; .env left unchanged.',
  );
  process.exit(1);
}

for (const [name, value] of updates) {
  const line = `${name}=${value}`;
  text = new RegExp(`^${name}=.*$`, 'm').test(text)
    ? text.replace(new RegExp(`^${name}=.*$`, 'm'), line)
    : text.replace(/\n*$/, '\n') + line + '\n';
}
writeFileSync(FILE, text);

console.log(
  `Wrote ${[...updates.keys()].join(', ')} to ${FILE}. It is git-ignored and stays on this machine.`,
);
console.log('Next: npm run agent');
