import { describe, expect, it } from 'vitest';
import {
  existingProfiles,
  successfulDigest,
} from '../../scripts/registration-check.mjs';

describe('registration result safety', () => {
  it('reads the SDK Transaction digest instead of an absent lowercase field', () => {
    expect(
      successfulDigest({
        $kind: 'Transaction',
        Transaction: { digest: 'digest-1', status: { success: true } },
      }),
    ).toBe('digest-1');
  });

  it('rejects failed and ambiguous execution results', () => {
    expect(() =>
      successfulDigest({
        $kind: 'FailedTransaction',
        FailedTransaction: {
          digest: 'digest-2',
          status: { success: false, error: { message: 'Move abort' } },
        },
      }),
    ).toThrow('Move abort');
    expect(() =>
      successfulDigest({ transaction: { digest: 'digest-3' } }),
    ).toThrow(/could not be confirmed/);
  });

  it('refuses to submit when duplicate checks are unavailable', () => {
    expect(
      existingProfiles(
        { ok: true },
        { data: { address: { objects: { nodes: [{ address: '0x1' }] } } } },
      ),
    ).toHaveLength(1);
    expect(() => existingProfiles({ ok: false }, {})).toThrow(
      /No transaction was sent/,
    );
    expect(() =>
      existingProfiles({ ok: true }, { errors: [{ message: 'Unavailable' }] }),
    ).toThrow(/No transaction was sent/);
    expect(() =>
      existingProfiles({ ok: true }, { data: { address: null } }),
    ).toThrow(/No transaction was sent/);
  });
});
