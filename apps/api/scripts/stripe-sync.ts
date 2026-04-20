/**
 * Seed / update Stripe products + prices from our canonical PLANS and
 * TOPUP_PACKS. Run with `pnpm --filter @remy/api stripe:sync`.
 *
 * Idempotent: if a product with `metadata.remy_plan` already exists it
 * will be updated, otherwise created. Prices are never updated (Stripe
 * prices are immutable) — instead we create a new one and mark the old
 * inactive.
 */
import Stripe from 'stripe';
import { PLANS, TOPUP_PACKS } from '@remy/shared/credits';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY required');
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: '2024-11-20.acacia' });

async function upsertProduct(name: string, metadata: Record<string, string>, description: string) {
  const list = await stripe.products.search({
    query: Object.entries(metadata)
      .map(([k, v]) => `metadata['${k}']:'${v}'`)
      .join(' AND '),
  });
  if (list.data[0]) {
    const updated = await stripe.products.update(list.data[0].id, { name, description, metadata });
    return updated;
  }
  return await stripe.products.create({ name, description, metadata });
}

async function ensurePrice(product: Stripe.Product, amount: number, recurring: boolean) {
  const prices = await stripe.prices.list({ product: product.id, active: true });
  const matching = prices.data.find(
    (p) =>
      p.unit_amount === amount &&
      Boolean(p.recurring) === recurring &&
      (!recurring || p.recurring?.interval === 'month'),
  );
  if (matching) return matching;

  for (const p of prices.data) await stripe.prices.update(p.id, { active: false });
  return stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: amount,
    ...(recurring ? { recurring: { interval: 'month' } } : {}),
  });
}

async function main() {
  console.info('==> syncing plans');
  for (const plan of Object.values(PLANS)) {
    if (plan.priceMonthly === 0) continue;
    const product = await upsertProduct(
      `Remy ${plan.name}`,
      { remy_plan: plan.id },
      `${plan.monthlyCredits} credits / month`,
    );
    const price = await ensurePrice(product, plan.priceMonthly, true);
    console.info(`  ${plan.id}: product=${product.id} price=${price.id}`);
  }

  console.info('==> syncing top-ups');
  for (const pack of Object.values(TOPUP_PACKS)) {
    const product = await upsertProduct(
      `Remy Top-up ${pack.credits}`,
      { remy_topup: pack.id },
      `${pack.credits} credits — one-time`,
    );
    const price = await ensurePrice(product, pack.price, false);
    console.info(`  ${pack.id}: product=${product.id} price=${price.id}`);
  }
  console.info('==> done. Copy the printed price IDs into your env.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
