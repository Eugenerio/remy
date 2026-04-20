import { describe, it, expect } from 'vitest';
import { isTerminal, REFUND_RULES, PARTIAL_REFUND_FRACTION } from './jobs';

describe('job status', () => {
  it('queued/running are not terminal', () => {
    expect(isTerminal('queued')).toBe(false);
    expect(isTerminal('running')).toBe(false);
    expect(isTerminal('rendering')).toBe(false);
  });

  it('completed/failed/cancelled/refunded are terminal', () => {
    for (const s of ['completed', 'failed', 'cancelled', 'refunded'] as const) {
      expect(isTerminal(s)).toBe(true);
    }
  });
});

describe('refund rules', () => {
  it('queued and reserved are full refund', () => {
    expect(REFUND_RULES.queued).toBe('full');
    expect(REFUND_RULES.reserved).toBe('full');
  });
  it('running/rendering are partial refund', () => {
    expect(REFUND_RULES.running).toBe('partial');
    expect(REFUND_RULES.rendering).toBe('partial');
  });
  it('completed charges fully', () => {
    expect(REFUND_RULES.completed).toBe('none');
  });
  it('partial fraction is 50%', () => {
    expect(PARTIAL_REFUND_FRACTION).toBe(0.5);
  });
});
