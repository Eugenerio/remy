import Stripe from 'stripe';
import { env } from '../env.js';
import { PLANS, TOPUP_PACKS, type PlanId, type TopupPackId } from '@remy/shared/credits';

export const stripeEnabled = Boolean(env.STRIPE_SECRET_KEY);

export const stripe = stripeEnabled
  ? new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' })
  : null;

const PLAN_PRICE_IDS: Record<Exclude<PlanId, 'free'>, string | undefined> = {
  starter: env.STRIPE_PRICE_STARTER,
  pro: env.STRIPE_PRICE_PRO,
  scale: env.STRIPE_PRICE_SCALE,
};

const TOPUP_PRICE_IDS: Record<TopupPackId, string | undefined> = {
  pack_100: env.STRIPE_PRICE_TOPUP_100,
  pack_500: env.STRIPE_PRICE_TOPUP_500,
  pack_2000: env.STRIPE_PRICE_TOPUP_2000,
};

export function planPriceId(plan: Exclude<PlanId, 'free'>): string {
  const id = PLAN_PRICE_IDS[plan];
  if (!id) throw new Error(`No Stripe price configured for plan ${plan}`);
  return id;
}

export function topupPriceId(pack: TopupPackId): string {
  const id = TOPUP_PRICE_IDS[pack];
  if (!id) throw new Error(`No Stripe price configured for pack ${pack}`);
  return id;
}

export function planForPrice(priceId: string): PlanId | null {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return plan as PlanId;
  }
  return null;
}

export function topupForPrice(priceId: string): TopupPackId | null {
  for (const [pack, id] of Object.entries(TOPUP_PRICE_IDS)) {
    if (id === priceId) return pack as TopupPackId;
  }
  return null;
}

export function creditsForPlan(plan: PlanId): number {
  return PLANS[plan].monthlyCredits;
}

export function creditsForPack(pack: TopupPackId): number {
  return TOPUP_PACKS[pack].credits;
}
