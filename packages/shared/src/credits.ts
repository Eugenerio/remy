/**
 * Credit costs are the single source of truth for how many credits a given
 * action consumes. Used by API (for reservation), AI service (for status
 * reporting) and web (for confirmation modals). Change with care — any
 * change should be followed by a price sheet update in docs/pricing.md.
 */

export const CREDIT_COSTS = {
  LORA_TRAINING: 200,
  OUTFIT_IMAGE: 5,
  REFERENCE_IMAGE: 8,
  VIDEO_GENERATION_SHORT: 40,
  VIDEO_GENERATION_LONG: 90,
  VIDEO_REGENERATION: 30,
  TREND_INGEST: 0,
  TREND_DEEP_ANALYSIS: 3,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export const CREDIT_ACTION_LABELS: Record<CreditAction, string> = {
  LORA_TRAINING: 'Train character LoRA',
  OUTFIT_IMAGE: 'Generate outfit image',
  REFERENCE_IMAGE: 'Generate reference image',
  VIDEO_GENERATION_SHORT: 'Short video generation (≤ 5s)',
  VIDEO_GENERATION_LONG: 'Long video generation (≤ 15s)',
  VIDEO_REGENERATION: 'Regenerate video',
  TREND_INGEST: 'Ingest trend source',
  TREND_DEEP_ANALYSIS: 'Deep trend analysis',
};

export type CreditTransactionKind =
  | 'purchase'
  | 'subscription_grant'
  | 'usage_reserve'
  | 'usage_charge'
  | 'usage_refund'
  | 'adjustment'
  | 'bonus'
  | 'expiry';

export interface CreditEstimate {
  action: CreditAction;
  cost: number;
  label: string;
}

export function estimate(action: CreditAction): CreditEstimate {
  return {
    action,
    cost: CREDIT_COSTS[action],
    label: CREDIT_ACTION_LABELS[action],
  };
}

/**
 * Plans — mirrored to Stripe products. The `monthlyCredits` amount is granted
 * on each billing cycle start; unused credits roll over up to `rolloverCap`.
 */
export const PLANS = {
  free: {
    id: 'free',
    name: 'Starter',
    monthlyCredits: 30,
    rolloverCap: 30,
    priceMonthly: 0,
  },
  starter: {
    id: 'starter',
    name: 'Creator',
    monthlyCredits: 300,
    rolloverCap: 600,
    priceMonthly: 1900,
  },
  pro: {
    id: 'pro',
    name: 'Studio',
    monthlyCredits: 1500,
    rolloverCap: 3000,
    priceMonthly: 7900,
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    monthlyCredits: 6000,
    rolloverCap: 12000,
    priceMonthly: 29900,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const TOPUP_PACKS = {
  pack_100: { id: 'pack_100', credits: 100, price: 1200 },
  pack_500: { id: 'pack_500', credits: 500, price: 4900 },
  pack_2000: { id: 'pack_2000', credits: 2000, price: 14900 },
} as const;

export type TopupPackId = keyof typeof TOPUP_PACKS;
