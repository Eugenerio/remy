import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { topupCheckoutSchema, subscriptionCheckoutSchema } from '@remy/shared/schemas';
import { PLANS, TOPUP_PACKS } from '@remy/shared/credits';
import { errors } from '@remy/shared/errors';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { stripe, stripeEnabled, planPriceId, topupPriceId } from '../services/stripe.js';

export const billingRoutes = new Hono<AppEnv>();

billingRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const [subscription, invoices, balance, transactions] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: user.id } }),
    prisma.invoice.findMany({ where: { userId: user.id }, orderBy: { issuedAt: 'desc' }, take: 24 }),
    prisma.creditBalance.findUnique({ where: { userId: user.id } }),
    prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  return c.json({
    subscription: {
      plan: subscription?.plan ?? 'free',
      status: subscription?.status ?? 'active',
      current_period_end: subscription?.currentPeriodEnd ?? null,
      cancel_at_period_end: subscription?.cancelAtPeriodEnd ?? false,
    },
    plans: PLANS,
    topups: TOPUP_PACKS,
    balance: {
      current: balance?.currentBalance ?? 0,
      pending: balance?.pendingBalance ?? 0,
      lifetime_granted: balance?.lifetimeGranted ?? 0,
      lifetime_spent: balance?.lifetimeSpent ?? 0,
    },
    invoices,
    transactions,
  });
});

billingRoutes.post('/checkout/subscription', zValidator('json', subscriptionCheckoutSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  if (!stripeEnabled || !stripe) throw errors.upstreamUnavailable('Stripe is not configured');
  const { plan } = c.req.valid('json');

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  let customerId = sub?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { remy_user_id: user.id },
    });
    customerId = customer.id;
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, stripeCustomerId: customerId, plan: 'free' },
      update: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: planPriceId(plan), quantity: 1 }],
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    success_url: `${env.PUBLIC_APP_URL}/settings/billing?success=1`,
    cancel_url: `${env.PUBLIC_APP_URL}/settings/billing?canceled=1`,
    metadata: { remy_user_id: user.id, plan },
  });

  return c.json({ url: session.url });
});

billingRoutes.post('/checkout/topup', zValidator('json', topupCheckoutSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  if (!stripeEnabled || !stripe) throw errors.upstreamUnavailable('Stripe is not configured');
  const { pack } = c.req.valid('json');

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  let customerId = sub?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { remy_user_id: user.id },
    });
    customerId = customer.id;
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, stripeCustomerId: customerId, plan: 'free' },
      update: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: topupPriceId(pack), quantity: 1 }],
    automatic_tax: { enabled: true },
    success_url: `${env.PUBLIC_APP_URL}/settings/billing?topup=1`,
    cancel_url: `${env.PUBLIC_APP_URL}/settings/billing?canceled=1`,
    metadata: { remy_user_id: user.id, topup_pack: pack },
  });

  return c.json({ url: session.url });
});

billingRoutes.post('/portal', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  if (!stripeEnabled || !stripe) throw errors.upstreamUnavailable('Stripe is not configured');
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!sub?.stripeCustomerId) throw errors.notFound('No Stripe customer');

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.PUBLIC_APP_URL}/settings/billing`,
  });
  return c.json({ url: session.url });
});
