import { describe, it, expect } from 'vitest';
import { CREDIT_COSTS, PLANS, TOPUP_PACKS, estimate } from './credits';

describe('credit costs', () => {
  it('lora training is the most expensive action', () => {
    const values = Object.values(CREDIT_COSTS);
    expect(Math.max(...values)).toBe(CREDIT_COSTS.LORA_TRAINING);
  });

  it('long video costs more than short', () => {
    expect(CREDIT_COSTS.VIDEO_GENERATION_LONG).toBeGreaterThan(
      CREDIT_COSTS.VIDEO_GENERATION_SHORT,
    );
  });

  it('regeneration costs less than generation', () => {
    expect(CREDIT_COSTS.VIDEO_REGENERATION).toBeLessThan(CREDIT_COSTS.VIDEO_GENERATION_SHORT);
  });

  it('ingest is free', () => {
    expect(CREDIT_COSTS.TREND_INGEST).toBe(0);
  });
});

describe('plans', () => {
  it('ascend in both price and credits', () => {
    const tiers = ['free', 'starter', 'pro', 'scale'] as const;
    for (let i = 1; i < tiers.length; i++) {
      expect(PLANS[tiers[i]!].priceMonthly).toBeGreaterThanOrEqual(PLANS[tiers[i - 1]!].priceMonthly);
      expect(PLANS[tiers[i]!].monthlyCredits).toBeGreaterThanOrEqual(PLANS[tiers[i - 1]!].monthlyCredits);
    }
  });

  it('rollover cap is >= monthly credits for every plan', () => {
    for (const p of Object.values(PLANS)) {
      expect(p.rolloverCap).toBeGreaterThanOrEqual(p.monthlyCredits);
    }
  });
});

describe('topups', () => {
  it('have decreasing $/credit for larger packs', () => {
    const rate = (p: { credits: number; price: number }) => p.price / p.credits;
    expect(rate(TOPUP_PACKS.pack_500)).toBeLessThan(rate(TOPUP_PACKS.pack_100));
    expect(rate(TOPUP_PACKS.pack_2000)).toBeLessThan(rate(TOPUP_PACKS.pack_500));
  });
});

describe('estimate helper', () => {
  it('returns cost + label', () => {
    const e = estimate('VIDEO_GENERATION_SHORT');
    expect(e.cost).toBe(CREDIT_COSTS.VIDEO_GENERATION_SHORT);
    expect(e.label.length).toBeGreaterThan(0);
  });
});
