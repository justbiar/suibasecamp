/* Write OPENROUTER_API_KEY into .env without opening an editor.
 *
 *   npm run set-key
 *
 * The key is read with echo off and never printed back. */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';

const FILE = '.env';
const EXAMPLE = '.env.example';

if (!existsSync(FILE)) {
  if (!existsSync(EXAMPLE)) {
    console.error(`No ${FILE} and no ${EXAMPLE}. Run ./setup.sh first.`);
    process.exit(1);
  }
  copyFileSync(EXAMPLE, FILE);
  console.log(`Created ${FILE} from ${EXAMPLE}.`);
}

if (!process.stdin.isTTY) {
  console.error('Run this in an interactive terminal so the key is not echoed.');
  process.exit(1);
}

// Raw mode, so the terminal never echoes the key: readline would print it
// before anything here could erase it.
const key = await new Promise((resolve, reject) => {
  process.stdout.write('Paste your OpenRouter key (input hidden): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  let buf = '';
  const done = (fn, value) => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeListener('data', onData);
    process.stdout.write('\n');
    fn(value);
  };
  const onData = (chunk) => {
    for (const ch of chunk) {
      if (ch === '\r' || ch === '\n') return done(resolve, buf.trim());
      if (ch === '\u0003') return done(reject, new Error('cancelled'));
      if (ch === '\u007f' || ch === '\b') buf = buf.slice(0, -1);
      else if (ch >= ' ') buf += ch;
    }
  };
  process.stdin.on('data', onData);
}).catch(() => {
  console.error('Cancelled; .env left unchanged.');
  process.exit(1);
});

if (!key) {
  console.error('Nothing pasted; .env left unchanged.');
  process.exit(1);
}
if (!/^sk-or-[A-Za-z0-9._~-]+$/.test(key)) {
  console.error(
    'That does not look like an OpenRouter key. They start with "sk-or-".\n' +
      'Create one at https://openrouter.ai/keys — .env left unchanged.',
  );
  process.exit(1);
}

const line = `OPENROUTER_API_KEY=${key}`;
let text = readFileSync(FILE, 'utf8');
text = /^OPENROUTER_API_KEY=.*$/m.test(text)
  ? text.replace(/^OPENROUTER_API_KEY=.*$/m, line)
  : text.replace(/\n*$/, '\n') + line + '\n';
writeFileSync(FILE, text);

console.log(`Saved to ${FILE}. The key stays on this machine; ${FILE} is git-ignored.`);
console.log('Next: npm run agent');
