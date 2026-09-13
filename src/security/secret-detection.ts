import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
const patterns = [
  /suiprivkey1[a-z0-9]+/i,
  /sk-(?:or-v1-)?[a-z0-9_-]{12,}/i,
  /(?:private[ _-]?key|seed phrase|mnemonic|api[ _-]?key|access[ _-]?token|password|secret|credential)\s*(?:is|:|=)\s*\S+/i,
  /\bBearer\s+\S+/i,
  /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  /(?<![a-zA-Z0-9])(?:[a-f0-9]{64}|[a-zA-Z0-9+/]{43}=)(?![a-zA-Z0-9])/i,
];
export class SecretGuard {
  private known = new Set<string>();
  register(value: string | undefined) {
    if (value) this.known.add(value);
  }
  contains(text: string): boolean {
    if (
      [...this.known].some((s) => text.includes(s)) ||
      patterns.some((p) => p.test(text))
    )
      return true;
    const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
    return [12, 15, 18, 21, 24].some((n) =>
      words.some(
        (_, i) =>
          i + n <= words.length &&
          validateMnemonic(words.slice(i, i + n).join(' '), wordlist),
      ),
    );
  }
  assertSafe(text: string) {
    if (this.contains(text))
      throw new Error(
        'Likely secret detected. Input was blocked locally; do not enter credentials into chat or memory.',
      );
  }
  redact(text: string) {
    let result = text;
    for (const s of this.known) result = result.split(s).join('[REDACTED]');
    for (const p of patterns)
      result = result.replace(new RegExp(p.source, 'gi'), '[REDACTED]');
    return result;
  }
}
